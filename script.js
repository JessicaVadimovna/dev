document.addEventListener('DOMContentLoaded', () => {
    "use strict";

    // ==========================================
    // 1. Плавная прокрутка (Smooth Scroll)
    // ==========================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ==========================================
    // 2. Прогресс бар скролла
    // ==========================================
    const scrollProgressBar = document.getElementById('scrollProgressBar');
    if (scrollProgressBar) {
        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = (docHeight > 0) ? (scrollTop / docHeight) * 100 : 0;
            scrollProgressBar.style.width = scrollPercent + '%';
        });
    }

    // ==========================================
    // 3. Кастомный скроллбар (CSS injection)
    // ==========================================
    const style = document.createElement('style');
    style.textContent = `
        ::-webkit-scrollbar { width: 12px; height: 12px; }
        ::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.3); border-radius: 10px; border: 1px solid rgba(0, 255, 65, 0.2); }
        ::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #00ff41, #ff0080); border-radius: 10px; border: 1px solid rgba(0, 255, 65, 0.5); box-shadow: 0 0 5px rgba(0, 255, 65, 0.5); }
        ::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, #00ff80, #ff40c0); box-shadow: 0 0 10px rgba(0, 255, 65, 0.8); }
    `;
    document.head.appendChild(style);
    document.documentElement.style.scrollbarWidth = 'thin';
    document.documentElement.style.scrollbarColor = '#00ff41 #000000';

    // ==========================================
    // 4. Матричный дождь
    // ==========================================
    function createMatrixRain(elementId, charColor, animationClass) {
        const element = document.getElementById(elementId);
        if (!element) return; // Исправление ошибки appendChild null

        const chars = "01";
        const fontSize = 12;
        const columns = Math.floor(window.innerWidth / fontSize);
        
        // Очищаем контейнер перед генерацией (на случай ресайза)
        element.innerHTML = '';

        for (let i = 0; i < columns; i++) {
            const char = document.createElement('div');
            char.className = animationClass;
            char.textContent = chars[Math.floor(Math.random() * chars.length)];
            char.style.left = (i * fontSize) + 'px';
            char.style.animationDuration = (Math.random() * 5 + 5) + 's';
            char.style.animationDelay = (Math.random() * 5) + 's';
            char.style.color = charColor;
            element.appendChild(char);
        }
    }

    createMatrixRain('headerMatrixRain', '#00ff41', 'matrix-char-header');
    createMatrixRain('footerMatrixRain', '#ff00bfff', 'matrix-char-footer');

    // ==========================================
    // 5. Меню
    // ==========================================
    const menuButton = document.getElementById('menuButton');
    const menuClose = document.getElementById('menuClose');
    const cyberMenu = document.getElementById('cyberMenu');
    const menuOverlay = document.getElementById('menuOverlay');

    if (menuButton && cyberMenu && menuOverlay) {
        const closeMenu = () => {
            cyberMenu.classList.remove('active');
            menuOverlay.classList.remove('active');
        };

        menuButton.addEventListener('click', () => {
            cyberMenu.classList.add('active');
            menuOverlay.classList.add('active');
        });

        if (menuClose) menuClose.addEventListener('click', closeMenu);
        menuOverlay.addEventListener('click', closeMenu);

        document.querySelectorAll('.menu-link').forEach(link => {
            link.addEventListener('click', closeMenu);
        });
    }

    // ==========================================
    // 6. Эффекты кнопок и текста
    // ==========================================
    // Hover эффекты Tech Items
    document.querySelectorAll(".tech-item").forEach((item) => {
        item.addEventListener("mouseenter", () => item.style.transform = "translateY(-2px)");
        item.addEventListener("mouseleave", () => item.style.transform = "translateY(0)");
    });

    // Глитч текста
    const glitchTexts = document.querySelectorAll(".glitch-text");
    if (glitchTexts.length > 0) {
        setInterval(() => {
            glitchTexts.forEach((text) => {
                if (Math.random() > 0.7) {
                    text.style.textShadow = `0 0 ${Math.random() * 10 + 5}px #00ff41`;
                    setTimeout(() => text.style.textShadow = "none", 100);
                }
            });
        }, 2000);
    }

    // Хакерский текст в заголовке
    const headerCyber = document.querySelector(".cyber-header");
    if (headerCyber) {
        const hackerTexts = ["ACCESS_GRANTED", "FIREWALL_BYPASS", "DATA_ENCRYPTED", "SYSTEM_SECURE", "NEURAL_INTERFACE"];
        setInterval(() => {
            const text = document.createElement("div");
            text.className = "hacker-text";
            text.textContent = hackerTexts[Math.floor(Math.random() * hackerTexts.length)];
            text.style.top = Math.random() * 60 + 10 + "px";
            text.style.color = `rgba(${Math.floor(Math.random()*100+155)}, ${Math.floor(Math.random()*100+155)}, ${Math.floor(Math.random()*100+155)}, 0.3)`;
            headerCyber.appendChild(text);
            setTimeout(() => text.remove(), 20000);
        }, 3000);
    }

    // Эффекты кнопок (Button Hover)
    document.querySelectorAll('.button').forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.15)';
            const glow = this.querySelector('.glow');
            if (glow) glow.style.transform = 'scale(1.1)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.1)';
            const glow = this.querySelector('.glow');
            if (glow) glow.style.transform = 'scale(1)';
        });

        button.addEventListener('mousedown', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
        });
        
        button.addEventListener('mouseup', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.15)';
        });
    });

    // ==========================================
    // 7. Cyber Canvas (Исправление getContext)
    // ==========================================
    function initCyberSphere() {
        const cyberCanvas = document.getElementById('cyberCanvas');
        // Критическое исправление: проверяем наличие canvas
        if (!cyberCanvas) return;

        const cyberCtx = cyberCanvas.getContext('2d');
        const div1Element = document.querySelector('.div1');
        
        if (!div1Element) return;

        let cyberWidth, cyberHeight;
        let cyberNodes = [];
        let cyberConnections = [];
        let isMouseOver = false;
        let idleTimer;

        function resizeCyberCanvas() {
            cyberWidth = cyberCanvas.width = div1Element.offsetWidth;
            cyberHeight = cyberCanvas.height = div1Element.offsetHeight;
            
            const particleCount = getParticleCount();
            if (cyberNodes.length !== particleCount) {
                createCyberNodes(particleCount);
            }
        }

        function getParticleCount() {
            const w = window.innerWidth;
            if (w <= 480) return 20;
            if (w <= 768) return 30;
            if (w <= 1024) return 40;
            return 50;
        }

        function createCyberNodes(count) {
            cyberNodes = [];
            for (let i = 0; i < count; i++) {
                cyberNodes.push({
                    x: Math.random() * cyberWidth,
                    y: Math.random() * cyberHeight,
                    z: Math.random() * 100 - 50,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    vz: (Math.random() - 0.5) * 0.2,
                    radius: Math.random() * 2 + 1,
                    hue: Math.random() * 30 + 100,
                    brightness: Math.random() * 0.5 + 0.5
                });
            }
        }

        function updateCyberNodes() {
            cyberConnections = [];
            // Оптимизация: если мышь не наведена, скорость 0.3, иначе 1
            const speedFactor = isMouseOver ? 1 : 0.3;

            for (let i = 0; i < cyberNodes.length; i++) {
                let node = cyberNodes[i];
                
                node.x += node.vx * speedFactor;
                node.y += node.vy * speedFactor;
                node.z += node.vz * speedFactor;

                // Отскок от стенок
                if (node.x < 0 || node.x > cyberWidth) node.vx *= -1;
                if (node.y < 0 || node.y > cyberHeight) node.vy *= -1;
                if (node.z < -50 || node.z > 50) node.vz *= -1;

                // Ограничение координат
                node.x = Math.max(0, Math.min(cyberWidth, node.x));
                node.y = Math.max(0, Math.min(cyberHeight, node.y));

                // Создание связей (вложенный цикл)
                for (let j = i + 1; j < cyberNodes.length; j++) {
                    const other = cyberNodes[j];
                    const dx = node.x - other.x;
                    const dy = node.y - other.y;
                    // Простая оптимизация дистанции (без квадратного корня пока не нужно отрисовать)
                    const distSq = dx * dx + dy * dy; 
                    
                    if (distSq < 22500) { // 150 * 150 = 22500
                        const distance = Math.sqrt(distSq);
                        cyberConnections.push({
                            from: node,
                            to: other,
                            opacity: 1 - distance / 150
                        });
                    }
                }
            }
        }

        function draw() {
            // Фон
            const gradient = cyberCtx.createRadialGradient(
                cyberWidth / 2, cyberHeight / 2, 0,
                cyberWidth / 2, cyberHeight / 2, Math.max(cyberWidth, cyberHeight) / 2
            );
            gradient.addColorStop(0, '#001a0d');
            gradient.addColorStop(1, '#000');
            cyberCtx.fillStyle = gradient;
            cyberCtx.fillRect(0, 0, cyberWidth, cyberHeight);

            // Линии
            cyberCtx.beginPath();
            cyberConnections.forEach(conn => {
                const alpha = conn.opacity * 0.3;
                cyberCtx.moveTo(conn.from.x, conn.from.y);
                cyberCtx.lineTo(conn.to.x, conn.to.y);
                // Цвет вычисляем по первому узлу для производительности
                cyberCtx.strokeStyle = `hsla(${conn.from.hue}, 100%, 50%, ${alpha})`;
            });
            cyberCtx.stroke();

            // Узлы
            cyberNodes.forEach(node => {
                const scale = 1 + node.z / 100;
                const radius = Math.max(0.1, node.radius * scale); // Защита от отрицательного радиуса
                const alpha = Math.max(0.3, 1 - Math.abs(node.z) / 50);
                
                cyberCtx.fillStyle = `hsla(${node.hue}, 100%, 80%, ${alpha})`;
                cyberCtx.beginPath();
                cyberCtx.arc(node.x, node.y, radius, 0, Math.PI * 2);
                cyberCtx.fill();
            });

            updateCyberNodes();
            requestAnimationFrame(draw);
        }

        // События мыши
        div1Element.addEventListener('mousemove', (e) => {
            isMouseOver = true;
            clearTimeout(idleTimer);
            
            const rect = div1Element.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Влияние мыши на частицы
            cyberNodes.forEach(node => {
                const dx = node.x - mouseX;
                const dy = node.y - mouseY;
                const distSq = dx * dx + dy * dy;
                
                if (distSq < 62500) { // 250^2
                    const distance = Math.sqrt(distSq);
                    const force = (250 - distance) / 250;
                    node.vx += (dx / distance) * force * 0.5;
                    node.vy += (dy / distance) * force * 0.5;
                }
            });
        });

        div1Element.addEventListener('mouseleave', () => {
            idleTimer = setTimeout(() => isMouseOver = false, 2000);
        });

        window.addEventListener('resize', resizeCyberCanvas);
        
        // Старт
        resizeCyberCanvas();
        draw();
    }

    // Запускаем Canvas
    initCyberSphere();
});




// Адаптивная маска для видео - добавьте этот код в конец вашего script.js

(function() {
  const video = document.querySelector('.hud-video');
  if (!video) return;

  function updateVideoMask() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isPortrait = height > width;
    
    let scale, ellipseX, ellipseY, ellipseStart, ellipseEnd;
    let topFade, bottomFade, leftFade, rightFade;
    
    // Определяем параметры в зависимости от размера экрана
    if (width <= 480) {
      // Маленькие мобильные
      scale = 1.15;
      ellipseX = 60;
      ellipseY = 75;
      ellipseStart = 15;
      ellipseEnd = 90;
      topFade = 8;
      bottomFade = 92;
      leftFade = 10;
      rightFade = 90;
    } else if (width <= 768 && isPortrait) {
      // Мобильные портрет
      scale = 1.1;
      ellipseX = 58;
      ellipseY = 72;
      ellipseStart = 12;
      ellipseEnd = 88;
      topFade = 5;
      bottomFade = 95;
      leftFade = 8;
      rightFade = 92;
    } else if (width <= 768) {
      // Мобильные альбом
      scale = 1.12;
      ellipseX = 55;
      ellipseY = 68;
      ellipseStart = 10;
      ellipseEnd = 85;
      topFade = 10;
      bottomFade = 90;
      leftFade = 12;
      rightFade = 88;
    } else if (width <= 1024) {
      // Планшеты
      scale = 1.08;
      ellipseX = 56;
      ellipseY = 70;
      ellipseStart = 8;
      ellipseEnd = 82;
      topFade = 6;
      bottomFade = 94;
      leftFade = 10;
      rightFade = 90;
    } else if (width >= 1440) {
      // Широкие экраны
      scale = 1.05;
      ellipseX = 58;
      ellipseY = 72;
      ellipseStart = 5;
      ellipseEnd = 80;
      topFade = 4;
      bottomFade = 96;
      leftFade = 8;
      rightFade = 92;
    } else {
      // Десктоп стандартный
      scale = 1.06;
      ellipseX = 57;
      ellipseY = 71;
      ellipseStart = 6;
      ellipseEnd = 82;
      topFade = 5;
      bottomFade = 95;
      leftFade = 10;
      rightFade = 90;
    }
    
    // Формируем маску
    const maskImage = `
      radial-gradient(ellipse ${ellipseX}% ${ellipseY}% at 50% 40%, 
        black ${ellipseStart}%, 
        transparent ${ellipseEnd}%),
      linear-gradient(to bottom, 
        transparent 0%, 
        black ${topFade}%, 
        black ${bottomFade}%, 
        transparent 100%),
      linear-gradient(to right, 
        transparent 0%, 
        black ${leftFade}%, 
        black ${rightFade}%, 
        transparent 100%)
    `;
    
    // Применяем стили
    video.style.transform = `scale(${scale})`;
    video.style.webkitMaskImage = maskImage;
    video.style.maskImage = maskImage;
  }
  
  // Обновляем при загрузке и изменении размера
  updateVideoMask();
  
  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateVideoMask, 100);
  });
  
  // Также обновляем при изменении ориентации
  window.addEventListener('orientationchange', function() {
    setTimeout(updateVideoMask, 300);
  });
})();
