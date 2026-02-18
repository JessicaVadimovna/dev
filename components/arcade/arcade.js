function initArcadeMachine() {
    const container = document.getElementById("arcade-3d-wrapper");
    
    // --- ПРОВЕРКИ ---
    if (!container) return;
    if (container.clientWidth === 0 || container.clientHeight === 0) return;
    if (typeof THREE === 'undefined') {
        console.error('Three.js не подключен!');
        return;
    }

    // -------------------------------------------------------------------------
    // 1. СЦЕНА, КАМЕРА, РЕНДЕР
    // -------------------------------------------------------------------------
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050510, 0.03);

    const camera = new THREE.PerspectiveCamera(
        60, 
        container.clientWidth / container.clientHeight, 
        0.1, 
        1000
    );
    camera.position.set(0, 1.5, 6);

    const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true 
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    if (renderer.outputColorSpace !== undefined) {
        renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else {
        renderer.outputEncoding = THREE.sRGBEncoding;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // -------------------------------------------------------------------------
    // 2. ОСВЕЩЕНИЕ
    // -------------------------------------------------------------------------
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    
    const spotLight = new THREE.SpotLight(0x00ffff, 1.5);
    spotLight.position.set(5, 10, 5);
    spotLight.castShadow = true;
    scene.add(spotLight);
    
    const screenLight = new THREE.PointLight(0x4488ff, 2, 6);
    screenLight.position.set(0, 1.5, 2);
    scene.add(screenLight);

    // -------------------------------------------------------------------------
    // 3. ВИДЕО
    // -------------------------------------------------------------------------
    const video = document.createElement("video");
    video.src = "assets/video/arcade.webm"; 
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    
    video.addEventListener('error', (e) => {
        console.error('❌ Ошибка видео:', video.error);
    });

    const playPromise = video.play();
    if (playPromise !== undefined) {
        playPromise.catch(() => {
            document.addEventListener('click', () => video.play(), { once: true });
        });
    }

    const videoTexture = new THREE.VideoTexture(video);
    if (videoTexture.colorSpace !== undefined) {
        videoTexture.colorSpace = THREE.SRGBColorSpace;
    } else {
        videoTexture.encoding = THREE.sRGBEncoding;
    }

    // 4. МАСШТАБ (ЗУМ)
    // Если видео "слишком увеличено", нужно УВЕЛИЧИВАТЬ эти значения.
    // Первое число - ширина (X), второе - высота (Y).
    videoTexture.repeat.set(3.5, 3.5);

    // 5. СМЕЩЕНИЕ
    // Диапазон от -0.5 до 0.5.
    videoTexture.offset.set(-0.8, -1.3); // X, Y


    const screenMat = new THREE.MeshBasicMaterial({ 
        map: videoTexture, 
        color: 0xffffff,
        side: THREE.DoubleSide
    });

    // -------------------------------------------------------------------------
    // 4. ЗАГРУЗКА МОДЕЛИ
    // -------------------------------------------------------------------------
    const loader = new THREE.GLTFLoader();
    const dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');
    loader.setDRACOLoader(dracoLoader);

    let modelGroup = new THREE.Group();
    scene.add(modelGroup);
    
    let mixer;
    let keychainMesh = null; 

    loader.load(
        'assets/3d/arcade.glb', 
        (gltf) => {
            const model = gltf.scene;

            const userScale = 5; 
            model.scale.set(userScale, userScale, userScale);
            
            model.position.set(0, -2, 0);
            model.rotation.set(0, 0, 0);

            let screenFound = false;

            model.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                    
                    if (node.material) {
                        node.material.emissive = new THREE.Color(0x111111);
                        node.material.emissiveIntensity = 0.2;
                    }
                    
                    const name = node.name.toLowerCase();
                    
                    // 1. Экран
                    if (name.includes('screen') || name.includes('display') || name.includes('monitor')) {
                        console.log('📺 Экран найден:', node.name);
                        node.material = screenMat;
                        screenFound = true;
                    }

                    // 2. БРЕЛОК (keychain)
                    if (name.includes('keychain')) {
                        console.log('🧸 Брелок найден:', node.name);
                        keychainMesh = node;
                        
                        // Поворот на 90° по оси X (ноги опущены вниз в глубину по -Z)
                        keychainMesh.rotation.set(Math.PI / 2, 0, 0);
                    }
                }
            });

            if (!screenFound) console.warn('⚠️ Экран не найден');
            if (!keychainMesh) console.warn('⚠️ Объект "keychain" не найден');

            modelGroup.add(model);

            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model);
                gltf.animations.forEach(clip => mixer.clipAction(clip).play());
            }
        },
        undefined,
        (error) => {
            console.error('❌ Ошибка GLB:', error);
        }
    );

    // -------------------------------------------------------------------------
    // 5. PARALLAX INPUT
    // -------------------------------------------------------------------------
    let mouseX = 0, mouseY = 0;
    const halfX = window.innerWidth / 2;
    const halfY = window.innerHeight / 2;

    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX - halfX) * 0.0005; 
        mouseY = (e.clientY - halfY) * 0.0005;
    });

    // -------------------------------------------------------------------------
    // 6. ANIMATION LOOP (PHYSICS)
    // -------------------------------------------------------------------------
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        
        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        if (mixer) mixer.update(delta);

        // A. Вращение автомата
        if (modelGroup) {
            modelGroup.rotation.y += (mouseX * 1.5 - modelGroup.rotation.y) * 0.05;
            modelGroup.rotation.x += (mouseY * 0.5 - modelGroup.rotation.x) * 0.05;
        }

        // B. Физика Брелка (ноги вниз по -Z)
        if (keychainMesh && modelGroup) {
            // Точка покоя по X = Math.PI/2 (90°, ноги направлены в -Z)
            const restAngleX = Math.PI / 2;
            
            // Целевой угол по X с учетом инерции от вращения автомата
            const targetX = restAngleX + (modelGroup.rotation.x * 1.2);
            
            // Целевой угол по Y (боковое качание влево-вправо)
            const targetY = -modelGroup.rotation.y * 1.2;
            
            // Целевой угол по Z (скручивание от инерции)
            const targetZ = modelGroup.rotation.y * 0.3;

            // Добавляем "дыхание" (Idle swing)
            const idleSwingY = Math.sin(elapsedTime * 2) * 0.02;
            const idleSwingZ = Math.cos(elapsedTime * 1.5) * 0.015;

            // Скорость реакции (инерция)
            const inertia = 0.06 * (delta * 60);

            // Плавное движение к целевым углам
            keychainMesh.rotation.x += (targetX - keychainMesh.rotation.x) * inertia;
            keychainMesh.rotation.y += ((targetY + idleSwingY) - keychainMesh.rotation.y) * inertia;
            keychainMesh.rotation.z += ((targetZ + idleSwingZ) - keychainMesh.rotation.z) * inertia;
        }

        // C. Камера
        camera.position.x += (mouseX * 5 - camera.position.x) * 0.05;
        camera.position.y += (-mouseY * 5 + 2 - camera.position.y) * 0.05;
        camera.lookAt(0, 1.5, 0);

        renderer.render(scene, camera);
    }

    animate();
    
    // -------------------------------------------------------------------------
    // 7. RESIZE
    // -------------------------------------------------------------------------
    window.addEventListener('resize', () => {
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}

// -------------------------------------------------------------------------
// STARTUP
// -------------------------------------------------------------------------
function initArcadeWhenReady() {
    const mainContent = document.getElementById('mainContent');
    
    if (mainContent && mainContent.style.display !== 'none') {
        initArcadeMachine();
        return;
    }
    
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.style.display !== 'none') {
                observer.disconnect();
                setTimeout(initArcadeMachine, 100);
            }
        });
    });
    
    if (mainContent) {
        observer.observe(mainContent, {
            attributes: true,
            attributeFilter: ['style']
        });
    } else {
        setTimeout(initArcadeMachine, 100);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initArcadeWhenReady);
} else {
    initArcadeWhenReady();
}