(function() {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    function createPanel() {
        if (document.getElementById('token-tracker-min')) return;

        const panel = document.createElement('div');
        panel.id = 'token-tracker-min';
        panel.className = 'token-tracker-min';
        // Только число, ничего больше
        panel.innerHTML = `<span id="tokens-val">0</span>`;
        
        document.body.appendChild(panel);
        
        setupDraggable(panel);
        loadPosition(panel);
        
        // Запуск обновлений
        updateDisplay();
        setInterval(updateDisplay, 3000);
    }

    function updateDisplay() {
        try {
            const context = SillyTavern.getContext();
            if (!context || !context.chat) return;
            
            // Считаем только текстовые сообщения в чате (без скрытых и системных)
            const text = context.chat
                .filter(m => !m.extra?.hidden && !m.is_system)
                .map(m => m.mes)
                .join("\n");
            
            const count = context.getTokenCount(text) || 0;
            const valEl = document.getElementById('tokens-val');
            if (valEl) valEl.textContent = count.toLocaleString();
        } catch (e) {
            // Тихо игнорируем ошибки, если контекст еще не прогрузился
        }
    }

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
        localStorage.setItem('st_min_tokens_pos', JSON.stringify({
            top: el.style.top,
            left: el.style.left
        }));
    }

    function loadPosition(el) {
        const saved = JSON.parse(localStorage.getItem('st_min_tokens_pos') || '{}');
        if (saved.top) {
            el.style.top = saved.top;
            el.style.left = saved.left;
        } else {
            // Дефолтная позиция, если ничего не сохранено
            el.style.top = '20px';
            el.style.left = '20px';
        }
    }

    // Инициализация через jQuery, как в рабочем примере
    jQuery(function() {
        const check = setInterval(() => {
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext()?.chat) {
                createPanel();
                clearInterval(check);
            }
        }, 1000);
    });
})();

    // Инициализация через jQuery, как в рабочем примере
    jQuery(function() {
        const check = setInterval(() => {
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext()?.chat) {
                createPanel();
                clearInterval(check);
            }
        }, 1000);
    });
})();
