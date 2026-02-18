/**
 * SHADERS (GLSL)
 * Vertex: Геометрический шум, глитч-эффект.
 * Fragment: Работа с Alpha-каналом (черные иконки становятся цветными), сканлайны, шум.
 */
const SHADERS = {
    vertex: `
        uniform float uTime;
        uniform float uGlitchStrength;
        varying vec2 vUv;
        varying float vNoise;
        varying vec3 vPosition;

        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        void main() {
            vUv = uv;
            vec4 modelPosition = modelMatrix * vec4(position, 1.0);
            
            // Медленный геометрический шум ("желе")
            float glitchTime = uTime * 3.0; 
            float noise = random(vec2(uv.y * 4.0, floor(glitchTime))); 
            
            float displacement = 0.0;
            if (uGlitchStrength > 0.0) {
                if(noise < 0.25 * uGlitchStrength) {
                    displacement = (random(vec2(uv.y, uTime * 0.5)) - 0.5) * uGlitchStrength * 0.4;
                }
            }
            modelPosition.x += displacement;
            
            vNoise = noise;
            vPosition = modelPosition.xyz;
            gl_Position = projectionMatrix * viewMatrix * modelPosition;
        }
    `,
    fragment: `
        uniform vec3 uColor;
        uniform float uTime;
        uniform float uOpacity;
        uniform sampler2D uTexture;
        uniform bool uHasTexture;
        uniform float uGlitchStrength;
        
        varying vec2 vUv;
        varying float vNoise;
        varying vec3 vPosition;

        void main() {
            vec3 finalColor = uColor;
            float alpha = 1.0;

            if (uHasTexture) {
                // RGB Shift (сдвиг каналов) при глитче
                float shift = 0.0;
                if (uGlitchStrength > 0.0 && vNoise < 0.4 * uGlitchStrength) {
                    shift = (vNoise - 0.5) * 0.05 * uGlitchStrength;
                }

                float a = texture2D(uTexture, vUv).a;
                float aR = texture2D(uTexture, vUv + vec2(shift, 0.0)).a;
                float aB = texture2D(uTexture, vUv - vec2(shift, 0.0)).a;

                alpha = a; // Используем только форму (Alpha)

                vec3 glitchTint = vec3(0.0);
                glitchTint.r = (aR - a) * 2.0;
                glitchTint.b = (aB - a) * 2.0;
                
                finalColor = uColor + glitchTint;
                finalColor = mix(finalColor, vec3(1.0), 0.15); // Легкий белый тинт
            } else {
                alpha = 0.6;
                finalColor = uColor + (vPosition.y * 0.2);
            }

            // Полоски сканлайна
            float stripes = sin((vPosition.y + uTime * 1.0) * 20.0);
            float scanline = step(0.95, stripes); 
            finalColor += uColor * scanline * 0.3;

            // Белый шум
            if (uGlitchStrength > 0.0) {
                float whiteNoise = step(0.85, sin(vPosition.y * 100.0 + uTime * 15.0));
                finalColor += vec3(1.0) * whiteNoise * uGlitchStrength * 0.6;
            }

            if (alpha < 0.05) discard;

            // Мягкое исчезновение сверху и снизу
            float fadeOut = smoothstep(-2.5, -1.2, vPosition.y) * smoothstep(2.5, 1.2, vPosition.y);
            
            gl_FragColor = vec4(finalColor, alpha * uOpacity * fadeOut);
        }
    `
};

class HologramVisualizer {
    constructor(container) {
        this.container = container;
        
        this.layout = {
            width: 0,
            height: 0,
            aspect: 1,
            scale: 1,
            arrowOffset: 0,
            isMobile: false
        };

        // === КОНФИГУРАЦИЯ И ДАННЫЕ ===
        this.config = {
            arrowColor: 0x00d5ff, 
            autoRotateDelay: 4000,
            modelYOffset: 0.8, // Базовая высота (будет меняться в resize)
            
            // ВАЖНО: fixY и fixScale для ручной калибровки каждой иконки
            models: [
                { 
                    file: 'assets/img/svg/github.svg', 
                    color: '#ff9d0b', title: 'PORTFOLIO', subtitle: 'SYSTEM // CORE', desc: 'Main Projects Hub.', link: 'https://github.com/JessicaVadimovna',
                    fixY: 0,
                    fixScale: 1.0 
                },
                { 
                    file: 'assets/img/svg/telegram.svg', 
                    color: '#2AABEE', title: 'TELEGRAM', subtitle: 'COMMUNICATION', desc: 'Direct secure channel.', link: 'https://t.me/JessiLis',
                    fixY: -0.15,
                    fixScale: 0.95 
                },
                { 
                    file: 'assets/img/svg/linkedin.svg', 
                    color: '#0077b5', title: 'LINKEDIN', subtitle: 'NETWORK', desc: 'Professional dossier.', link: 'https://www.linkedin.com/in/jessilis',
                    fixY: -0.1,    // Чуть опускаем
                    fixScale: 1.0 
                },
                { 
                    file: 'assets/img/svg/codepen.svg', 
                    color: '#39b906', title: 'CODEPEN', subtitle: 'SANDBOX', desc: 'Experimental code.', link: 'https://codepen.io/JessiLis',
                    fixY: -0.1, 
                    fixScale: 1.0 
                },
                { 
                    file: 'assets/img/svg/email.svg', 
                    color: '#c300ff', title: 'CONTACT', subtitle: 'TRANSMISSION', desc: 'Send electronic mail.', link: 'mailto:jessilisdevjob@gmail.com',
                    fixY: 0, 
                    fixScale: 1.0 
                }
            ]
        };

        this.state = {
            currentIndex: 0,
            isTransitioning: false,
        };

        this.objects = {
            models: [],
            arrows: [] // Теперь это массив ГРУПП (Mesh + Hitbox)
        };

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2(-100, -100);
        this.clock = new THREE.Clock();
        this.autoRotateTimer = null;
        this.resizeObserver = null;

        this.init();
    }

    async init() {
        if (typeof THREE === 'undefined' || typeof gsap === 'undefined') {
            console.error("THREE.js or GSAP libraries are missing.");
            return;
        }

        this.setupScene();
        this.setupStyles(); 
        this.setupDOM();
        
        // Первичный расчет размеров (чтобы понять мобилка или нет)
        this.onResize();

        try {
            await this.loadImages();
            this.createStylishArrows(); // Создаем стрелки с хитбоксами
            
            // Вторичный расчет (применяем позиции к загруженным объектам)
            this.onResize();
            
            // Запуск первого слайда
            this.updateSlide(0, true);
            
            this.addEventListeners();
            this.startAutoRotation();
            
            // Биндим animate, чтобы не терять контекст
            this.animate = this.animate.bind(this);
            this.animate();
        } catch (e) {
            console.error("Holo Critical Error:", e);
        }
    }

    startAutoRotation() {
        if (this.autoRotateTimer) clearInterval(this.autoRotateTimer);
        this.autoRotateTimer = setInterval(() => {
            if (!this.state.isTransitioning && document.visibilityState === 'visible') {
                let next = this.state.currentIndex + 1;
                if (next >= this.config.models.length) next = 0;
                this.updateSlide(next);
            }
        }, this.config.autoRotateDelay);
    }

    resetAutoRotation() {
        this.startAutoRotation();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100); 
        
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance"
        });
        
        // Ограничиваем PixelRatio для производительности
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);
    }

    setupStyles() {
        // Стили внедряются через JS, если их нет в CSS
        if (document.getElementById('holo-styles')) return;
        const style = document.createElement('style');
        style.id = 'holo-styles';
        style.textContent = `
            .holo-ui-container {
                position: absolute; bottom: 25px; left: 0; width: 100%;
                pointer-events: none; z-index: 10;
                display: flex; justify-content: center;
                transition: opacity 0.4s ease;
            }
        `;
        document.head.appendChild(style);
    }

    setupDOM() {
        if (document.getElementById('holo-ui')) return;
        const uiDiv = document.createElement('div');
        uiDiv.className = 'holo-ui-container';
        uiDiv.id = 'holo-ui';
        uiDiv.innerHTML = `
            <div class="holo-glass-panel" id="holo-panel">
                <h1 class="holo-title" id="holo-title">LOADING</h1>
                <div class="holo-subtitle" id="holo-subtitle">SYSTEM</div>
                <div class="holo-desc" id="holo-desc">Initializing...</div>
            </div>
        `;
        this.container.appendChild(uiDiv);
        this.ui = {
            container: uiDiv,
            panel: document.getElementById('holo-panel'),
            title: document.getElementById('holo-title'),
            subtitle: document.getElementById('holo-subtitle'),
            desc: document.getElementById('holo-desc')
        };
    }

    createHologramMaterial(colorHex, texture = null) {
        return new THREE.ShaderMaterial({
            vertexShader: SHADERS.vertex,
            fragmentShader: SHADERS.fragment,
            uniforms: {
                uColor: { value: new THREE.Color(colorHex) },
                uTime: { value: 0 },
                uGlitchStrength: { value: 0 },
                uOpacity: { value: 0 },
                uTexture: { value: texture },
                uHasTexture: { value: !!texture } 
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
    }

    async loadImages() {
        const loader = new THREE.TextureLoader();
        
        const promises = this.config.models.map((item) => {
            return new Promise((resolve) => {
                loader.load(item.file, (texture) => {
                    // 30x30 сегментов для красивого искажения
                    const geometry = new THREE.PlaneGeometry(2, 2, 30, 30); 
                    const mat = this.createHologramMaterial(item.color, texture);
                    const mesh = new THREE.Mesh(geometry, mat);
                    this.setupModelData(mesh, mat, item);
                    resolve(mesh);
                }, undefined, () => {
                    // Fallback
                    const geometry = new THREE.PlaneGeometry(2, 2, 30, 30);
                    const mat = this.createHologramMaterial(item.color, null); 
                    const mesh = new THREE.Mesh(geometry, mat);
                    this.setupModelData(mesh, mat, item);
                    resolve(mesh);
                });
            });
        });
        return Promise.all(promises).then(models => this.objects.models = models);
    }

    setupModelData(model, mat, item) {
        model.visible = false;
        model.userData = { 
            material: mat, 
            link: item.link, 
            baseY: this.config.modelYOffset, // Будет перезаписано в onResize
            // Сохраняем индивидуальные поправки
            fixY: item.fixY || 0,
            fixScale: item.fixScale || 1.0
        };
        this.scene.add(model);
    }

    // === СОЗДАНИЕ СТРЕЛОК С ХИТБОКСАМИ ===
    createStylishArrows() {
        // Мы создаем Группы. В группе будет:
        // 1. Визуальная стрелка (шеврон)
        // 2. Невидимый квадрат (хитбокс) для удобного клика
        
        const leftGroup = new THREE.Group();
        const rightGroup = new THREE.Group();

        // 1. Геометрия шеврона
        const chevronShape = new THREE.Shape();
        chevronShape.moveTo(0.4, 0.5);
        chevronShape.lineTo(-0.2, 0);
        chevronShape.lineTo(0.4, -0.5);
        // Внутренняя грань
        chevronShape.lineTo(0.3, -0.3);
        chevronShape.lineTo(-0.05, 0);
        chevronShape.lineTo(0.3, 0.3);
        chevronShape.closePath();

        const geometry = new THREE.ShapeGeometry(chevronShape);
        geometry.center();
        
        const mat = this.createHologramMaterial(this.config.arrowColor, null);
        mat.uniforms.uOpacity.value = 0.5;

        const leftVis = new THREE.Mesh(geometry, mat.clone());
        const rightVis = new THREE.Mesh(geometry, mat.clone());
        rightVis.rotation.y = Math.PI; 

        // 2. Хитбокс (Прозрачная плоскость 2x2)
        const hitGeometry = new THREE.PlaneGeometry(2.5, 2.5);
        const hitMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            visible: false, // Невидимый
            alphaTest: 0.5 // Нужен для корректного raycast иногда
        }); 
        
        const leftHit = new THREE.Mesh(hitGeometry, hitMaterial);
        const rightHit = new THREE.Mesh(hitGeometry, hitMaterial);

        // Собираем группы
        leftGroup.add(leftVis);
        leftGroup.add(leftHit);
        leftGroup.userData = { type: 'arrow', dir: -1, visual: leftVis };

        rightGroup.add(rightVis);
        rightGroup.add(rightHit);
        rightGroup.userData = { type: 'arrow', dir: 1, visual: rightVis };

        this.scene.add(leftGroup, rightGroup);
        this.objects.arrows = [leftGroup, rightGroup]; // Сохраняем группы
    }

    onResize() {
        if (!this.container || !this.camera || !this.renderer) return;
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.layout.width = width;
        this.layout.height = height;
        this.layout.aspect = width / height;
        this.layout.isMobile = width < 768;

        this.camera.aspect = this.layout.aspect;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);

        // === НАСТРОЙКИ АДАПТИВА ===
        if (this.layout.isMobile) {
            // [MOBILE]
            this.camera.position.set(0, 0, 9.5); // Дальше
            this.layout.scale = 0.9;             // Размер иконки
            this.config.modelYOffset = 1.3;      // ВЫСОКО (освобождаем место для текста)
            
            // Стрелки максимально по краям
            const vFOV = THREE.MathUtils.degToRad(this.camera.fov);
            const visibleHeight = 2 * Math.tan(vFOV / 2) * 9.5;
            const visibleWidth = visibleHeight * this.camera.aspect;
            
            this.layout.arrowOffset = visibleWidth * 0.42; 
            var arrowScale = 0.65; // Размер стрелок
        } else {
            // [DESKTOP]
            this.camera.position.set(0, 0, 6.0);
            this.layout.scale = 1.35;
            this.config.modelYOffset = 0.8;
            
            // Стрелки ближе к центру (композиционно)
            const vFOV = THREE.MathUtils.degToRad(this.camera.fov);
            const visibleHeight = 2 * Math.tan(vFOV / 2) * 6.0;
            const visibleWidth = visibleHeight * this.camera.aspect;
            
            this.layout.arrowOffset = Math.min(visibleWidth * 0.35, 4.5);
            var arrowScale = 1.1;
        }

        // Применяем настройки к стрелкам
        if (this.objects.arrows.length > 0) {
            const leftGroup = this.objects.arrows[0];
            const rightGroup = this.objects.arrows[1];

            leftGroup.userData.baseX = -this.layout.arrowOffset;
            leftGroup.userData.baseScale = arrowScale;
            leftGroup.scale.set(arrowScale, arrowScale, 1);
            
            rightGroup.userData.baseX = this.layout.arrowOffset;
            rightGroup.userData.baseScale = arrowScale;
            rightGroup.scale.set(arrowScale, arrowScale, 1);
        }

        // Мгновенно обновляем текущую модель (если она есть)
        const currentModel = this.objects.models[this.state.currentIndex];
        if (currentModel && currentModel.visible && !this.state.isTransitioning) {
            
            // Расчет с учетом индивидуальных поправок
            const finalScale = this.layout.scale * currentModel.userData.fixScale;
            const finalY = this.config.modelYOffset + currentModel.userData.fixY;

            gsap.to(currentModel.scale, { x: finalScale, y: finalScale, z: finalScale, duration: 0.4 });
            gsap.to(currentModel.userData, { baseY: finalY, duration: 0.4 });
        }
    }

    updateSlide(index, isFirst = false) {
        if (this.state.isTransitioning && !isFirst) return;
        this.state.isTransitioning = true;

        const prev = this.objects.models[this.state.currentIndex];
        const next = this.objects.models[index];
        const data = this.config.models[index];
        
        // UI Анимация
        if (this.ui.panel) {
            this.ui.container.style.opacity = '0';
            setTimeout(() => {
                if(this.ui.title) {
                    this.ui.title.innerText = data.title;
                    this.ui.title.style.color = data.color;
                }
                if(this.ui.subtitle) this.ui.subtitle.innerText = data.subtitle;
                if(this.ui.desc) this.ui.desc.innerText = data.desc;
                if(this.ui.panel) {
                    this.ui.panel.style.borderTopColor = data.color;
                    this.ui.panel.style.boxShadow = `0 10px 40px ${data.color}20`;
                }
                this.ui.container.style.opacity = '1';
            }, 300);
        }

        const tl = gsap.timeline({
            onComplete: () => {
                this.state.currentIndex = index;
                this.state.isTransitioning = false;
                if (prev && prev !== next) prev.visible = false;
            }
        });

        // Анимация исчезновения
        if (prev && !isFirst) {
            const u = prev.userData.material.uniforms;
            // Глитч перед исчезновением
            tl.to(u.uGlitchStrength, { value: 4.0, duration: 0.3 }, 0);
            tl.to(u.uOpacity, { value: 0, duration: 0.3 }, 0.1);
            // Увеличение и растворение
            const currentScale = prev.scale.x;
            tl.to(prev.scale, { 
                x: currentScale * 1.2, 
                y: currentScale * 1.2, 
                duration: 0.3 
            }, 0);
        }

        // Анимация появления
        if (next) {
            next.visible = true;
            const time = this.clock.getElapsedTime();
            
            // Вычисляем целевые параметры С УЧЕТОМ FIX-ов
            const targetY = this.config.modelYOffset + (next.userData.fixY || 0);
            const targetScale = this.layout.scale * (next.userData.fixScale || 1.0);

            // Сохраняем в userData для animate()
            next.userData.baseY = targetY;
            
            // Стартовая позиция
            next.position.y = targetY + Math.sin(time * 1.5) * 0.08; 
            
            // Начинаем с плоской полоски (эффект "разворачивания")
            next.scale.set(targetScale * 0.1, targetScale * 0.1, targetScale); 
            
            const u = next.userData.material.uniforms;
            u.uOpacity.value = 0;
            u.uGlitchStrength.value = 3.0; // Сильный глитч на старте

            const delay = isFirst ? 0 : 0.2;
            
            // Раскрытие
            tl.to(next.scale, { 
                x: targetScale, 
                y: targetScale, 
                z: targetScale, 
                duration: 0.8, 
                ease: "elastic.out(1, 0.75)" 
            }, delay);

            tl.to(u.uOpacity, { value: 1, duration: 0.4 }, delay);
            // Плавное затухание глитча
            tl.to(u.uGlitchStrength, { value: 0, duration: 0.6 }, delay + 0.1);
        }
    }

    addEventListeners() {
        this.resizeObserver = new ResizeObserver(() => this.onResize());
        this.resizeObserver.observe(this.container);
        this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.container.addEventListener('click', this.onClick.bind(this));
    }

    onMouseMove(e) {
        if (this.state.isTransitioning) return;
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // intersectObjects с параметром true (рекурсивно), чтобы поймать хитбоксы внутри групп
        const intersects = this.raycaster.intersectObjects([
            ...this.objects.arrows, 
            ...this.objects.models.filter(m => m.visible)
        ], true);

        this.container.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
        
        // --- ЛОГИКА ХОВЕРА ДЛЯ ГРУПП СТРЕЛОК ---
        const arrowGroups = this.objects.arrows;
        let hoveredGroup = null;

        // Проверяем, попали ли мы в какую-то стрелку (или её хитбокс)
        for(let hit of intersects) {
            // hit.object может быть хитбоксом или визуальной частью. Ищем родителя-группу.
            const group = arrowGroups.find(g => g === hit.object || g === hit.object.parent);
            if(group) {
                hoveredGroup = group;
                break;
            }
        }

        arrowGroups.forEach(group => {
            const isHovered = (group === hoveredGroup);
            const base = group.userData.baseScale || 1.0;
            const targetScale = isHovered ? base * 1.2 : base;
            
            // Плавно увеличиваем всю группу
            group.scale.setScalar(THREE.MathUtils.lerp(group.scale.x, targetScale, 0.15));
            
            // Меняем прозрачность только у визуальной части
            if(group.userData.visual && group.userData.visual.material.uniforms) {
                 const uOp = group.userData.visual.material.uniforms.uOpacity;
                 uOp.value = THREE.MathUtils.lerp(uOp.value, isHovered ? 0.9 : 0.5, 0.1);
            }
        });
    }

    onClick(e) {
        if (this.state.isTransitioning) return;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        // Рекурсивный поиск клика
        const intersects = this.raycaster.intersectObjects([...this.objects.arrows, ...this.objects.models.filter(m => m.visible)], true);
        
        if (intersects.length > 0) {
            const hitObj = intersects[0].object;

            // 1. ПРОВЕРКА НА СТРЕЛКУ (ГРУППУ)
            const arrowGroup = this.objects.arrows.find(g => g === hitObj || g === hitObj.parent);
            if (arrowGroup) {
                this.resetAutoRotation();
                // Эффект клика (сжатие)
                gsap.fromTo(arrowGroup.scale, 
                    { x: arrowGroup.scale.x * 0.8, y: arrowGroup.scale.y * 0.8 }, 
                    { x: arrowGroup.userData.baseScale, y: arrowGroup.userData.baseScale, duration: 0.4, ease: "elastic.out" }
                );
                
                let next = this.state.currentIndex + arrowGroup.userData.dir;
                if (next >= this.config.models.length) next = 0;
                if (next < 0) next = this.config.models.length - 1;
                this.updateSlide(next);
                return;
            }

            // 2. ПРОВЕРКА НА МОДЕЛЬ (ИКОНКУ)
            const model = this.objects.models[this.state.currentIndex];
            if (model && (hitObj === model)) {
                // На мобильном можно кликать и рядом
                const isMobileTap = this.layout.isMobile && Math.abs(this.mouse.x) < 0.6 && Math.abs(this.mouse.y) < 0.6;
                
                if (hitObj === model || isMobileTap) {
                    this.resetAutoRotation();
                    // Эффект "электрического удара"
                    gsap.to(model.userData.material.uniforms.uGlitchStrength, { value: 3.0, duration: 0.2, yoyo: true, repeat: 1 });
                    
                    if (model.userData.link && model.userData.link !== '#') {
                        setTimeout(() => window.open(model.userData.link, '_blank'), 300);
                    }
                }
            }
        }
    }

    animate() {
        requestAnimationFrame(this.animate);
        const time = this.clock.getElapsedTime();

        // 1. Анимация иконок
        this.objects.models.forEach(model => {
            if (model.visible) {
                const u = model.userData.material.uniforms;
                u.uTime.value = time;
                
                // Левитация вокруг userData.baseY (который мы откалибровали)
                model.position.y = model.userData.baseY + Math.sin(time * 2.0) * 0.05;
                model.rotation.y = Math.sin(time * 0.5) * 0.1;
                model.rotation.x = Math.sin(time * 0.3) * 0.05;
            }
        });

        // 2. Анимация стрелок (Групп)
        this.objects.arrows.forEach(group => {
            // Обновляем время шейдера для визуальной части
            if(group.userData.visual && group.userData.visual.material.uniforms) {
                group.userData.visual.material.uniforms.uTime.value = time;
            }
            
            const base = group.userData.baseX || (group.userData.dir * 2);
            // Легкое "дыхание" по горизонтали
            group.position.x = base + (Math.sin(time * 1.5) * 0.03 * group.userData.dir); 
            // Высота синхронизирована с глобальной высотой (чтобы быть на уровне иконок)
            group.position.y = this.config.modelYOffset; 
        });

        this.renderer.render(this.scene, this.camera);
    }
}

// Запуск
window.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector(".hologram-container");
    if(container) new HologramVisualizer(container);
});