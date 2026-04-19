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
        panelElement.innerHTML = `<span id="token-count">—</span>`;
        document.body.appendChild(panelElement);

        tokenValueSpan = document.getElementById('token-count');

        setupDraggable(panelElement);
        loadPosition(panelElement);
    }

    // Перетаскивание (поддержка мыши и сенсора)
    function setupDraggable(el) {
        const onStart = (e) => {
            e.stopPropagation();
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

        const onEnd = () => {
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

    // Чтение токенов из itemizedPrompts (Prompt Itemization → Total Tokens in Prompt)
    function readTokensFromItemizedPrompts() {
        try {
            // itemizedPrompts — глобальный массив, заполняется после каждой генерации
            if (typeof itemizedPrompts === 'undefined' || !itemizedPrompts.length) {
                return null;
            }

            const last = itemizedPrompts[itemizedPrompts.length - 1];
            if (!last) return null;

            // Для OAI/Claude (Chat Completion): сумма всех oai*Tokens полей
            // Это именно то, что отображается как "Total Tokens in Prompt"
            const oaiFields = [
                'oaiStartTokens',
                'oaiPromptTokens',
                'oaiBiasTokens',
                'oaiNudgeTokens',
                'oaiJailbreakTokens',
                'oaiSystemTokens',
                'oaiInjectedTokens',
            ];

            // Проверяем, есть ли OAI-поля
            const hasOaiFields = oaiFields.some(f => typeof last[f] === 'number');

            if (hasOaiFields) {
                const total = oaiFields.reduce((sum, f) => sum + (last[f] || 0), 0);
                return total > 0 ? total : null;
            }

            // Для Text Completion (KoboldAI, TextGen и др.)
            const textFields = [
                'charDescriptionTokens',
                'charPersonalityTokens',
                'scenarioTextTokens',
                'userPersonaStringTokens',
                'worldInfoStringTokens',
                'allAnchorsTokens',
                'injectedPromptTokens',
                'chatHistoryTokens',
            ];

            const hasTextFields = textFields.some(f => typeof last[f] === 'number');

            if (hasTextFields) {
                const total = textFields.reduce((sum, f) => sum + (last[f] || 0), 0);
                return total > 0 ? total : null;
            }

            return null;
        } catch (err) {
            console.warn('Token Tracker: ошибка при чтении itemizedPrompts', err);
            return null;
        }
    }

    function updateTokenCount() {
        if (!tokenValueSpan) return;

        const count = readTokensFromItemizedPrompts();
        if (count !== null) {
            tokenValueSpan.textContent = count.toLocaleString();
        }
        // Если null — не трогаем: оставляем прежнее значение (или '—' при старте)
    }

    // Инициализация
    jQuery(async function() {
        createPanel();

        // Ждём готовности ST и подписываемся на события генерации
        const waitForST = setInterval(() => {
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
                clearInterval(waitForST);

                const context = SillyTavern.getContext();
                const { eventSource, event_types } = context;

                if (eventSource && event_types) {
                    // Обновляем после каждого полученного сообщения от AI
                    eventSource.on(event_types.MESSAGE_RECEIVED, () => {
                        // Небольшая задержка: ST заполняет itemizedPrompts асинхронно
                        setTimeout(updateTokenCount, 500);
                    });

                    // Также обновляем после свайпа
                    eventSource.on(event_types.MESSAGE_SWIPED, () => {
                        setTimeout(updateTokenCount, 500);
                    });
                }

                // Первичное обновление при наличии данных
                updateTokenCount();
            }
        }, 500);
    });

})();
