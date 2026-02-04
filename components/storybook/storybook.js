document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('story-modal');
    if (!modal) return; // Проверка, чтобы не падало, если html не вставлен

    const modalImg = document.getElementById('modal-img-target');
    const modalTitle = document.getElementById('modal-title-target');
    const modalDesc = document.getElementById('modal-desc-target');
    const closeBtn = document.querySelector('.modal-close-btn');
    const backdrop = document.querySelector('.modal-backdrop');
    
    const cards = document.querySelectorAll('.story-card');

    // Функция открытия
    const openModal = (card) => {
        const imgSource = card.querySelector('.story-img').src;
        const title = card.querySelector('h3').innerText;
        // Берем скрытый текст полного описания
        const fullDesc = card.querySelector('.story-hidden').innerHTML;

        modalImg.src = imgSource;
        modalTitle.innerText = title;
        modalDesc.innerHTML = fullDesc;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Блокируем скролл страницы
    };

    // Функция закрытия
    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };

    // Вешаем слушатели на карточки
    cards.forEach(card => {
        card.addEventListener('click', () => openModal(card));
    });

    // Закрытие
    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);
    
    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
});