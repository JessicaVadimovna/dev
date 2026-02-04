document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("cyber-bg");
    if (!canvas) return;
    
    // Оптимизация: отключаем альфа-канал для скорости
    const ctx = canvas.getContext("2d", { alpha: false });

    // Офскрин-канвас (кэш фона)
    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d');

    let w, h, cols, rows, offsetX, offsetY;
    let isMobile = false;

    // НАСТРОЙКИ
    const config = {
        cellSize: 100,      // Размер клетки
        crossSize: 5,       // Размер крестиков
        
        // Цвета
        colorBg: "#000000",
        colorNormal: "0, 243, 255",  // Cyan
        colorError: "255, 0, 60",    // Red
        colorSuccess: "0, 255, 128", // Green

        baseOpacity: 0.1,   // Прозрачность сетки
        activeOpacity: 0.7, // Яркость под мышкой

        // Логика игры (ТОЛЬКО ПК)
        successChance: 0.7,
        timeToResult: 40,
        timeToDie: 160,
        mouseRadius: 300,
        mouseRadiusSq: 300 * 300,

        // Глитчи фона
        randomGlitchChance: 0.01, 
        glitchDuration: { min: 30, max: 80 }
    };

    const mouse = { x: -1000, y: -1000 };
    
    // Состояние мыши (ТОЛЬКО ПК)
    let mouseState = {
        col: -1,
        row: -1,
        timer: 0,
        resultType: 'success'
    };

    let randomGlitches = [];
    let isTabActive = true;

    document.addEventListener("visibilitychange", () => {
        isTabActive = !document.hidden;
        if (isTabActive) animate();
    });

    window.addEventListener("mousemove", (e) => {
        if (!isMobile) {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        }
    });

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
        offscreenCanvas.width = w;
        offscreenCanvas.height = h;

        isMobile = w < 768; // Если ширина меньше 768px - считаем мобильным

        // Адаптация размеров
        if (isMobile) {
            config.cellSize = 60; // На мобиле клетки чуть меньше чем на ПК в оригинале, но больше чем пиксели
            config.randomGlitchChance = 0.03; // Больше активности фона
        } else {
            config.cellSize = 100; // Оригинальный размер для ПК
            config.randomGlitchChance = 0.005; // Меньше шума, так как есть мышь
        }

        cols = Math.ceil(w / config.cellSize) + 1;
        rows = Math.ceil(h / config.cellSize) + 1;
        offsetX = (w % config.cellSize) / 2;
        offsetY = (h % config.cellSize) / 2;

        drawStaticGrid();
    }
    window.addEventListener("resize", resize);

    // --- РИСОВАНИЕ СТАТИЧНОЙ СЕТКИ (КЭШ) ---
    function drawStaticGrid() {
        offscreenCtx.fillStyle = config.colorBg;
        offscreenCtx.fillRect(0, 0, w, h);

        offscreenCtx.lineWidth = 1;
        offscreenCtx.strokeStyle = `rgba(${config.colorNormal}, ${config.baseOpacity})`;
        offscreenCtx.beginPath();

        for (let i = 0; i < cols; i++) {
            let x = i * config.cellSize + offsetX;
            offscreenCtx.moveTo(x, 0); offscreenCtx.lineTo(x, h);
        }
        for (let j = 0; j < rows; j++) {
            let y = j * config.cellSize + offsetY;
            offscreenCtx.moveTo(0, y); offscreenCtx.lineTo(w, y);
        }
        offscreenCtx.stroke();

        // Крестики
        offscreenCtx.beginPath();
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                let x = i * config.cellSize + offsetX;
                let y = j * config.cellSize + offsetY;
                drawCross(offscreenCtx, x, y, config.crossSize);
            }
        }
        offscreenCtx.stroke();
    }

    // --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
    function drawCross(ctxTarget, x, y, size) {
        ctxTarget.moveTo(x - size, y); ctxTarget.lineTo(x + size, y);
        ctxTarget.moveTo(x, y - size); ctxTarget.lineTo(x, y + size);
    }

    function drawCheckmark(x, y, size, colorRGB) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${colorRGB}, 1)`;
        ctx.lineWidth = 3;
        ctx.moveTo(x + size * 0.2, y + size * 0.5);
        ctx.lineTo(x + size * 0.45, y + size * 0.75);
        ctx.lineTo(x + size * 0.8, y + size * 0.25);
        ctx.stroke();
    }

    function drawXMark(x, y, size, colorRGB) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${colorRGB}, 1)`;
        ctx.lineWidth = 3;
        ctx.moveTo(x + size * 0.25, y + size * 0.25);
        ctx.lineTo(x + size * 0.75, y + size * 0.75);
        ctx.moveTo(x + size * 0.75, y + size * 0.25);
        ctx.lineTo(x + size * 0.25, y + size * 0.75);
        ctx.stroke();
    }

    // --- РИСОВАНИЕ АКТИВНОЙ КЛЕТКИ ---
    // mode: 'normal' | 'success' | 'error' | 'background'
    function drawActiveCell(x, y, size, colorRGB, mode) {
        // Фон клетки
        const bgOpacity = (mode === 'error' || mode === 'success') ? 0.2 : 0.1;
        ctx.fillStyle = `rgba(${colorRGB}, ${bgOpacity})`;
        ctx.fillRect(x, y, size, size);

        // Уголки (только на ПК для красоты, на мобильных опускаем детализацию)
        if (!isMobile) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${colorRGB}, 1)`;
            ctx.lineWidth = 1;
            const cs = config.crossSize * 1.5;
            drawCross(ctx, x, y, cs);
            drawCross(ctx, x + size, y, cs);
            drawCross(ctx, x, y + size, cs);
            drawCross(ctx, x + size, y + size, cs);
            ctx.stroke();
        }

        // Логика текста и иконок (ТОЛЬКО ПК)
        if (!isMobile && mode !== 'background') {
            if (mode === 'success') {
                if (Math.random() > 0.5) drawCheckmark(x, y, size, colorRGB);
                else {
                    ctx.font = "bold 16px monospace";
                    ctx.fillStyle = `rgba(${colorRGB}, 1)`;
                    ctx.textAlign = "center";
                    ctx.fillText("ACCESS", x + size/2, y + size/2 + 5);
                }
            }
            else if (mode === 'error') {
                if (Math.random() > 0.5) drawXMark(x, y, size, colorRGB);
                else {
                    ctx.font = "bold 16px monospace";
                    ctx.fillStyle = `rgba(${colorRGB}, 1)`;
                    ctx.textAlign = "center";
                    ctx.fillText("DENIED", x + size/2, y + size/2 + 5);
                }
            }
            else { // Normal scan
                ctx.fillStyle = `rgba(${colorRGB}, 0.5)`;
                // Сканлайн
                const scanY = y + (Date.now() / 15) % size;
                ctx.fillRect(x, scanY, size, 2);
                
                // Цифры
                ctx.fillStyle = `rgba(${colorRGB}, 0.8)`;
                ctx.font = "12px monospace";
                ctx.textAlign = "center";
                for (let k = 1; k < 4; k++) {
                    ctx.fillText(Math.random() > 0.5 ? "1" : "0", x + size/2, y + size/2 - 20 + k*15);
                }
            }
        } 
        // Логика для мобильных или фонового глитча
        else {
             ctx.fillStyle = `rgba(${colorRGB}, 0.5)`;
             const scanY = y + (Date.now() / 20) % size;
             ctx.fillRect(x, scanY, size, 2);
        }
    }

    function animate() {
        if (!isTabActive) return;

        // 1. Рисуем фон из кэша
        ctx.drawImage(offscreenCanvas, 0, 0);

        // 2. Генерируем глитчи
        if (Math.random() < config.randomGlitchChance) {
            randomGlitches.push({
                col: Math.floor(Math.random() * cols),
                row: Math.floor(Math.random() * rows),
                life: Math.random() * (config.glitchDuration.max - config.glitchDuration.min) + config.glitchDuration.min,
                maxLife: 60
            });
        }

        // Рисуем глитчи
        for (let i = randomGlitches.length - 1; i >= 0; i--) {
            let g = randomGlitches[i];
            g.life--;
            // Плавное затухание
            let alpha = g.life < 10 ? g.life / 10 : 1;
            if (alpha > 0) {
                 // Для глитчей используем упрощенную отрисовку
                 drawActiveCell(g.col * config.cellSize + offsetX, g.row * config.cellSize + offsetY, config.cellSize, config.colorNormal, 'background');
            }
            if (g.life <= 0) randomGlitches.splice(i, 1);
        }

        // 3. ЛОГИКА ДЛЯ ПК (Мышь)
        if (!isMobile) {
            const currentMouseCol = Math.floor((mouse.x - offsetX) / config.cellSize);
            const currentMouseRow = Math.floor((mouse.y - offsetY) / config.cellSize);

            // Состояние
            if (currentMouseCol !== mouseState.col || currentMouseRow !== mouseState.row) {
                mouseState.col = currentMouseCol;
                mouseState.row = currentMouseRow;
                mouseState.timer = 0;
                mouseState.resultType = Math.random() < config.successChance ? 'success' : 'error';
            } else {
                mouseState.timer++;
            }

            // Отрисовка фонаря (подсветка вокруг)
            const range = Math.ceil(config.mouseRadius / config.cellSize) + 1;
            const startCol = Math.max(0, currentMouseCol - range);
            const endCol = Math.min(cols, currentMouseCol + range);
            const startRow = Math.max(0, currentMouseRow - range);
            const endRow = Math.min(rows, currentMouseRow + range);

            ctx.beginPath();
            for (let i = startCol; i < endCol; i++) {
                for (let j = startRow; j < endRow; j++) {
                    const x = i * config.cellSize + offsetX;
                    const y = j * config.cellSize + offsetY;
                    
                    const dx = mouse.x - x;
                    const dy = mouse.y - y;
                    const distSq = dx*dx + dy*dy; // Оптимизация (без корня)

                    if (distSq < config.mouseRadiusSq) {
                        const dist = Math.sqrt(distSq);
                        const alpha = (1 - dist / config.mouseRadius) * (config.activeOpacity - config.baseOpacity);
                        
                        if (alpha > 0) {
                            // Меняем цвет сетки если это активная клетка в фазе результата
                            let drawColor = config.colorNormal;
                            if (i === mouseState.col && j === mouseState.row && 
                                mouseState.timer > config.timeToResult && mouseState.timer < config.timeToDie) {
                                drawColor = mouseState.resultType === 'success' ? config.colorSuccess : config.colorError;
                            }

                            ctx.strokeStyle = `rgba(${drawColor}, ${alpha})`;
                            drawCross(ctx, x, y, config.crossSize);
                            // Линии
                            ctx.moveTo(x, y); ctx.lineTo(x + config.cellSize, y);
                            ctx.moveTo(x, y); ctx.lineTo(x, y + config.cellSize);
                        }
                    }
                }
            }
            ctx.stroke();

            // Отрисовка активной клетки (С ТЕКСТОМ И ЭФФЕКТАМИ)
            if (mouseState.col >= 0 && mouseState.row >= 0) {
                const x = mouseState.col * config.cellSize + offsetX;
                const y = mouseState.row * config.cellSize + offsetY;
                
                if (mouseState.timer < config.timeToResult) {
                    drawActiveCell(x, y, config.cellSize, config.colorNormal, 'normal');
                } else if (mouseState.timer < config.timeToDie) {
                    const color = mouseState.resultType === 'success' ? config.colorSuccess : config.colorError;
                    drawActiveCell(x, y, config.cellSize, color, mouseState.resultType);
                }
            }
        }

        requestAnimationFrame(animate);
    }

    resize();
    animate();
});