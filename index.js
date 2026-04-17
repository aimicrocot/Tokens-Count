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
    async function updateTokenCount() {
        if (!tokenValueSpan) return;

        try {
            const context = SillyTavern.getContext();
            let total = 0;

            // 1. Прямое получение итемизации (самый точный способ в ST)
            // Это исключает попадание таймстампов вместо цифр
            const itemization = await context.getPromptItemization();
            
            if (itemization && Array.isArray(itemization)) {
                // Считаем сумму токенов всех компонентов
                total = itemization.reduce((sum, item) => {
                    const count = parseInt(item.tokens);
                    return sum + (isNaN(count) ? 0 : count);
                }, 0);
            }

            // 2. Если итемизация не сработала, пробуем достать из спец. переменной
            // Но проверяем, что это адекватное число (не таймстамп)
            if (total <= 0) {
                const rawCount = window.token_count;
                if (typeof rawCount === 'number' && rawCount < 100000000) {
                    total = rawCount;
                }
            }

            // 3. Последний шанс: парсим текст из статус-бара, если он там есть
            if (total <= 0) {
                const stCounter = document.getElementById('token_counter');
                if (stCounter) {
                    const match = stCounter.textContent.match(/\d+/);
                    if (match) total = parseInt(match[0]);
                }
            }

            // Вывод результата (если всё равно 0, значит промпт еще не готов)
            if (total > 0) {
                tokenValueSpan.textContent = total.toLocaleString();
            }

        } catch (err) {
            console.warn('Token Tracker: ошибка при расчете', err);
        }
    }

    // Инициализация
    jQuery(function() {
        createPanel();

        // Слушаем событие обновления токенов от самой SillyTavern
        $(document).on('token_count_updated', function() {
            updateTokenCount();
        });

        // Запускаем проверку раз в 3 секунды для подстраховки
        setInterval(updateTokenCount, 3000);

        // Первый запуск с небольшой задержкой
        setTimeout(updateTokenCount, 1000);
    });

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
