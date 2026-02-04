document.addEventListener("DOMContentLoaded", () => {
    // 1. Кешируем элементы
    const els = {
        loader: document.getElementById('simple-loader'),
        content: document.getElementById('mainContent'),
        fill: document.getElementById('progress-fill'),
        glow: document.getElementById('progress-glow'),
        pct: document.getElementById('percent-text'),
        status: document.getElementById('sys-status'),
        mem: document.getElementById('mem-val')
    };

    // Проверка на случай отсутствия элементов
    if (!els.loader || !els.fill) return;

    // 2. Блокируем скролл
    document.body.style.overflow = 'hidden';

    // Этапы (Text States)
    const stages = [
        { pct: 0, msg: "INIT_SEQ..." },
        { pct: 25, msg: "LOADING_ASSETS" },
        { pct: 50, msg: "PROCESSING" },
        { pct: 75, msg: "OPTIMIZING" },
        { pct: 95, msg: "READY" }
    ];

    let progress = 0;
    let speed = 1.5; // Базовая скорость (чем больше, тем быстрее)

    // Функция обновления (Game Loop pattern)
    const updateLoader = () => {
        // Динамическая скорость: 
        // Быстро в начале, чуть медленнее в середине, рывок в конце
        let increment = (Math.random() * speed) + 0.5;
        
        // Ускоряем в самом начале и в самом конце для "snappy" эффекта
        if (progress > 80) increment += 1.0; 
        
        progress += increment;

        // Ограничитель
        if (progress >= 100) {
            progress = 100;
            completeLoading();
            return; // Останавливаем цикл
        } else {
            requestAnimationFrame(updateLoader); // Планируем следующий кадр
        }

        render(progress);
    };

    // Функция отрисовки
    const render = (val) => {
        const pctInt = Math.floor(val);

        // Двигаем бар и свечение
        els.fill.style.width = `${val}%`;
        if (els.glow) els.glow.style.left = `${val}%`;
        
        // Текст процентов
        if (els.pct) els.pct.innerText = `${pctInt}%`;

        // Обновляем статус текстом
        const stage = stages.reverse().find(s => pctInt >= s.pct);
        if (stage && els.status && els.status.innerText !== stage.msg) {
            stages.reverse(); // Возвращаем массив обратно (оптимизация find)
            els.status.innerText = stage.msg;
        }

        // Рандомные цифры памяти (для эффекта "хакера")
        if (els.mem && Math.random() > 0.7) {
            els.mem.innerText = Math.floor(Math.random() * 800 + 200) + ' MB';
        }
    };

    // Финал
    const completeLoading = () => {
        render(100);
        if (els.status) els.status.innerText = "SYSTEM_ONLINE";
        if (els.status) els.status.style.color = "#fff"; // Белая вспышка текста

        setTimeout(() => {
            // Скрываем лоадер
            els.loader.classList.add('hidden');
            
            // Показываем контент
            if (els.content) {
                els.content.style.display = 'block';
                // Триггер анимации появления (если есть CSS класс .fade-in)
                requestAnimationFrame(() => els.content.style.opacity = 1);
            }

            // Разблокируем скролл
            document.body.style.overflow = '';
            document.body.style.overflowX = 'hidden';

        }, 400); // Небольшая задержка перед исчезновением (чтобы увидеть 100%)
    };

    // ЗАПУСК
    // Небольшая пауза перед стартом, чтобы браузер успел отрендерить первый кадр
    setTimeout(() => {
        requestAnimationFrame(updateLoader);
    }, 100);
});