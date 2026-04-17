(function() {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    let panelElement = null;
    let tokenValueSpan = null;

    // Создание плашки
    function createPanel() {
        if (document.getElementById('token-tracker-panel')) return;

        panelElement = document.createElement('div');
        panelElement.id = 'token-tracker-panel';
        panelElement.className = 'token-tracker-panel';
        panelElement.innerHTML = `<span id="token-count">0</span>`;
        document.body.appendChild(panelElement);

        tokenValueSpan = document.getElementById('token-count');

        setupDraggable(panelElement);
        loadPosition(panelElement);
    }

    // Перетаскивание (поддержка мыши и сенсора)
    function setupDraggable(el) {
        const onStart = (e) => {
            // Останавливаем всплытие, чтобы не активировать другие элементы интерфейса
            e.stopPropagation();
            // Предотвращаем стандартное поведение (выделение текста, скролл и т.п.)
            e.preventDefault();

            isDragging = true;
            el.classList.add('dragging');

            const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
            startX = clientX;
            startY = clientY;

            const rect = el.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            el.style.right = 'auto';
            el.style.bottom = 'auto';

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onEnd);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onEnd);
        };

        const onMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            e.stopPropagation();

            const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

            el.style.left = (initialLeft + (clientX - startX)) + 'px';
            el.style.top = (initialTop + (clientY - startY)) + 'px';
        };

        const onEnd = (e) => {
            if (!isDragging) return;
            isDragging = false;
            panelElement.classList.remove('dragging');
            savePosition(panelElement);

            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        };

        el.addEventListener('mousedown', onStart);
        el.addEventListener('touchstart', onStart, { passive: false });
    }

    // Сохранение позиции
    function savePosition(el) {
        localStorage.setItem('tokenTracker_pos', JSON.stringify({
            top: el.style.top,
            left: el.style.left
        }));
    }

    // Загрузка позиции
    function loadPosition(el) {
        const saved = JSON.parse(localStorage.getItem('tokenTracker_pos') || '{}');
        if (saved.top) el.style.top = saved.top;
        if (saved.left) el.style.left = saved.left;
    }

    // Подсчёт токенов в текущем чате
    function updateTokenCount() {
        if (!tokenValueSpan) return;

        try {
            // 1. Пытаемся взять чистую цифру из глобальной переменной ST
            let total = window.token_count;

            // 2. Если в переменной пусто, берем из основного счетчика в углу экрана
            if (!total || total === 0) {
                const stCounter = document.getElementById('token_counter');
                if (stCounter) {
                    const text = stCounter.textContent.trim();
                    // Извлекаем только цифры (чтобы фраза "Подсчитать токены" превратилась в 0)
                    total = parseInt(text.replace(/\D/g, ''), 10);
                }
            }

            // 3. Если всё еще 0, ищем в окне статистики (независимо от языка)
            if (!total || total === 0) {
                // Ищем строку, которая идет после иконки или заголовка и содержит число
                const lastFlex = $('.flex1').last(); 
                if (lastFlex.length > 0) {
                    total = parseInt(lastFlex.text().replace(/\D/g, ''), 10);
                }
            }

            // Выводим только если это число, иначе ставим 0
            const finalCount = (isNaN(total) || total === null) ? 0 : total;
            tokenValueSpan.textContent = finalCount.toLocaleString();

        } catch (err) {
            console.error('Token Tracker Error:', err);
        }
    }

    // Правильная инициализация (подписка на события ST)
    jQuery(function() {
        createPanel();

        // Обновлять, когда сама SillyTavern закончила расчет
        $(document).on('token_count_updated', updateTokenCount);
        
        // Обновлять при переключении чатов или персонажей
        $(document).on('v_char_selected', updateTokenCount);

        // Резервный цикл обновления (раз в 2 секунды)
        setInterval(updateTokenCount, 2000);

        // Первый запуск
        updateTokenCount();
    });
    
    // Инициализация
    jQuery(function() {
        createPanel();

        // Вместо того чтобы просто ждать 3 секунды, мы подписываемся на события ST
        // Это заставит капсулу обновляться МГНОВЕННО, как только ST пересчитает токены
        $(document).on('token_count_updated', function() {
            updateTokenCount();
        });

        // Также обновляем при вводе (на всякий случай)
        $(document).on('input', '#send_textarea', function() {
            updateTokenCount();
        });

        // Первичный запуск
        setTimeout(updateTokenCount, 500);
    });
    
    // Инициализация после загрузки страницы и готовности ST
    jQuery(async function() {
        createPanel();

        const waitForST = setInterval(() => {
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext()?.chat) {
                updateTokenCount();
                clearInterval(waitForST);
            }
        }, 1000);

        setInterval(updateTokenCount, 3000);
    });
})();
