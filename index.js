(function() {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    // Создание плашки
    function createMinimalPanel() {
        if (document.getElementById('min-token-tracker')) return;

        const panel = document.createElement('div');
        panel.id = 'min-token-tracker';
        panel.className = 'min-token-tracker';
        panel.innerHTML = `<span id="min-token-count">0</span>`;
        
        document.body.appendChild(panel);
        setupDraggable(panel);
        loadPosition(panel);
        
        // Запуск обновлений
        updateCount();
        setInterval(updateCount, 3000);

        // Слушаем события SillyTavern для мгновенного обновления
        const eventSource = SillyTavern.getContext()?.eventSource;
        if (eventSource) {
            const events = ['message_sent', 'message_received', 'chat_changed', 'generation_ended'];
            events.forEach(event => eventSource.on(event, () => setTimeout(updateCount, 500)));
        }
    }

    // Подсчет токенов (текущий контекст чата)
    function updateCount() {
        try {
            const context = SillyTavern.getContext();
            if (!context || !context.chat) return;
            
            // Считаем токены всех видимых сообщений
            const text = context.chat
                .filter(m => !m.extra?.hidden && !m.is_system)
                .map(m => m.mes)
                .join("\n");
            
            const count = context.getTokenCount(text) || 0;
            const el = document.getElementById('min-token-count');
            if (el) el.textContent = count.toLocaleString();
        } catch (e) {
            console.error('Token update error:', e);
        }
    }

    // Логика перемещения
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
            const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
            el.style.left = (initialLeft + (clientX - startX)) + 'px';
            el.style.top = (initialTop + (clientY - startY)) + 'px';
        };

        const onEnd = () => {
            isDragging = false;
            el.classList.remove('dragging');
            savePosition(el);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        };

        el.addEventListener('mousedown', onStart);
        el.addEventListener('touchstart', onStart, { passive: true });
    }

    function savePosition(el) {
        localStorage.setItem('minTokenPos', JSON.stringify({ top: el.style.top, left: el.style.left }));
    }

    function loadPosition(el) {
        const saved = JSON.parse(localStorage.getItem('minTokenPos') || '{}');
        if (saved.top) el.style.top = saved.top;
        if (saved.left) el.style.left = saved.left;
    }

    // Старт
    jQuery(function() {
        const check = setInterval(() => {
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext()?.chat) {
                createMinimalPanel();
                clearInterval(check);
            }
        }, 1000);
    });
})();
        const res = prompt("Limit:", maxTokens);
        if (res !== null && !isNaN(parseInt(res))) {
            maxTokens = parseInt(res);
            localStorage.setItem('tokenTrackerMaxTokens', maxTokens);
            updateDisplay();
        }
    }

    function savePosition(el) {
        localStorage.setItem('tokenTracker_pos', JSON.stringify({
            top: el.style.top,
            left: el.style.left,
            collapsed: isCollapsed
        }));
    }

    function loadPosition(el) {
        const saved = JSON.parse(localStorage.getItem('tokenTracker_pos') || '{}');
        if (saved.top) el.style.top = saved.top;
        if (saved.left) el.style.left = saved.left;
        isCollapsed = localStorage.getItem('tokenTracker_collapsed') === 'true';
        el.classList.toggle('collapsed', isCollapsed);
    }

    // Инициализация
    jQuery(async function() {
        createPanel();
        const check = setInterval(() => {
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext()?.chat) {
                updateDisplay();
                clearInterval(check);
            }
        }, 1000);
        setInterval(updateDisplay, 3000);
    });
})();
