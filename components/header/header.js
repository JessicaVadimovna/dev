document.addEventListener('DOMContentLoaded', () => {
    // === 1. Элементы ===
    const burger = document.getElementById('sysBurger');
    const mobileMenu = document.getElementById('sysMobileMenu');
    const mobileLinks = document.querySelectorAll('.mobile-link');
    const desktopLinks = document.querySelectorAll('.sys-link');
    const headerProgress = document.getElementById('headerProgress');
    
    // Все секции, на которые мы ссылаемся (добавь ID в HTML, если их нет!)
    const sections = document.querySelectorAll('section[id], div[id]'); 

    // === 2. Логика Мобильного Меню ===
    function toggleMenu() {
        burger.classList.toggle('active');
        mobileMenu.classList.toggle('open');
        
        // Блокировка скролла
        document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';

        // Анимация появления ссылок (каскад)
        mobileLinks.forEach((link, index) => {
            if (mobileMenu.classList.contains('open')) {
                link.style.transitionDelay = `${0.1 + index * 0.1}s`;
            } else {
                link.style.transitionDelay = '0s';
            }
        });
    }

    burger.addEventListener('click', toggleMenu);

    // Закрытие меню при клике на ссылку
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mobileMenu.classList.contains('open')) toggleMenu();
        });
    });

    // === 3. Active State on Scroll (IntersectionObserver) ===
    const observerOptions = {
        root: null,
        rootMargin: '-50% 0px -50% 0px', // Активна секция, которая посередине экрана
        threshold: 0
    };

    const observerCallback = (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Удаляем active у всех
                desktopLinks.forEach(link => link.classList.remove('active'));
                
                // Находим ссылку, ведущую на эту секцию
                const id = entry.target.getAttribute('id');
                const activeLink = document.querySelector(`.sys-link[href="#${id}"]`);
                
                if (activeLink) {
                    activeLink.classList.add('active');
                }
            }
        });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    sections.forEach(section => observer.observe(section));

    // === 4. Scroll Progress Bar в хедере ===
    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        if(headerProgress) {
            headerProgress.style.width = scrolled + "%";
        }
    });

    // === 5. Плавный скролл для всех якорей (на всякий случай) ===
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElem = document.querySelector(targetId);
            
            if (targetElem) {
                // Учитываем высоту хедера при скролле
                const headerOffset = 80;
                const elementPosition = targetElem.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });
});