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

            const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

            el.style.left = (initialLeft + (clientX - startX)) + 'px';
            el.style.top = (initialTop + (clientY - startY)) + 'px';
        };

        const onEnd = () => {
            isDragging = false;
            panelElement.classList.remove('dragging');
            savePosition(panelElement);

            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        };

        el.addEventListener('mousedown', onStart);
        el.addEventListener('touchstart', onStart, { passive: true });
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

    // Отображение плашки только на странице чата
    function setPanelVisibility() {
        if (!panelElement) return;
        try {
            const context = SillyTavern.getContext();
            // context.page содержит название текущей страницы (chat, character, settings и т.д.)
            const currentPage = context.page;
            const shouldShow = (currentPage === 'chat');
            panelElement.style.display = shouldShow ? '' : 'none';
        } catch(e) {
            // Если не удалось определить страницу, скрываем плашку
            panelElement.style.display = 'none';
        }
    }

    // Подсчёт токенов в текущем чате
    function updateTokenCount() {
        if (!tokenValueSpan) return;

        try {
            const context = SillyTavern.getContext();
            if (!context || !context.chat) {
                tokenValueSpan.textContent = '0';
                return;
            }

            const messages = context.chat.filter(msg => !msg.extra?.hidden && !msg.is_system);
            const fullText = messages.map(msg => msg.mes).join('\n');
            const tokenCount = context.getTokenCount(fullText) || 0;

            tokenValueSpan.textContent = tokenCount.toLocaleString();
        } catch (err) {
            console.warn('Token Tracker: не удалось подсчитать токены', err);
            tokenValueSpan.textContent = '?';
        }
    }

    // Инициализация после загрузки страницы и готовности ST
    jQuery(async function() {
        createPanel();

        // Ждём готовности SillyTavern
        const waitForST = setInterval(() => {
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext()?.chat) {
                updateTokenCount();
                clearInterval(waitForST);
            }
        }, 1000);

        // Регулярное обновление токенов (каждые 3 секунды)
        setInterval(updateTokenCount, 3000);

        // Следим за сменой страницы, чтобы показывать/скрывать плашку
        if (typeof SillyTavern !== 'undefined') {
            $(document).on('SillyTavern:page-changed', setPanelVisibility);
            // Первоначальная проверка видимости
            setTimeout(setPanelVisibility, 500);
        }
    });
})();
