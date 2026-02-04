document.addEventListener('DOMContentLoaded', () => {
    const bearContainer = document.getElementById('hanging-bear-wrapper');
    const bearImg = document.getElementById('hanging-bear');

    if (!bearContainer || !bearImg) return;

    // Функция обработки наведения
    const handleSwing = (e) => {
        // Если анимация уже идет, сбрасываем классы, чтобы перезапустить
        bearContainer.classList.remove('swing-left', 'swing-right');
        
        // Магия CSS reflow (перерисовка) для перезапуска анимации
        void bearContainer.offsetWidth; 

        // Получаем координаты центра медведя
        const rect = bearContainer.getBoundingClientRect();
        const bearCenterX = rect.left + rect.width / 2;

        // e.clientX - координата мыши по горизонтали
        // Если мышь левее центра -> толкаем вправо (медведь летит вправо)
        // Если мышь правее центра -> толкаем влево
        
        // Нюанс физики: если я касаюсь слева, медведь должен отклониться вправо (отрицательный угол)
        // Если касаюсь справа, медведь отклоняется влево (положительный угол)
        
        if (e.clientX < bearCenterX) {
            // Удар слева -> качается вправо (как маятник, получивший импульс)
            bearContainer.classList.add('swing-right');
        } else {
            // Удар справа -> качается влево
            bearContainer.classList.add('swing-left');
        }
    };

    // Слушаем событие входа мыши на картинку
    bearImg.addEventListener('mouseenter', handleSwing);
    
    // Для мобильных устройств (touch)
    bearImg.addEventListener('touchstart', (e) => {
        // Получаем первую точку касания
        const touch = e.touches[0];
        // Эмулируем событие мыши для функции handleSwing
        handleSwing({ clientX: touch.clientX });
    }, { passive: true });
});