(function() {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    function createMinimalPanel() {
        if (document.getElementById('min-token-tracker')) return;

        const panel = document.createElement('div');
        panel.id = 'min-token-tracker';
        panel.className = 'min-token-tracker';
        panel.innerHTML = `<span id="min-token-count">...</span>`;
        
        document.body.appendChild(panel);
        
        setupDraggable(panel);
        loadPosition(panel); // Загружаем позицию
        ensureVisible(panel); // Проверяем, что она не за экраном
        
        updateCount();
        setInterval(updateCount, 3000);

        // Слушаем события для мгновенного обновления
        try {
            const eventSource = SillyTavern.getContext()?.eventSource;
            if (eventSource) {
                eventSource.on('message_sent', () => setTimeout(updateCount, 500));
                eventSource.on('message_received', () => setTimeout(updateCount, 500));
                eventSource.on('chat_changed', () => setTimeout(updateCount, 200));
            }
        } catch(e) { console.log("Token Tracker: EventSource not ready"); }
    }

    function updateCount() {
        try {
            const context = SillyTavern.getContext();
            if (!context || !context.chat) return;
            
            const text = context.chat
                .filter(m => !m.extra?.hidden && !m.is_system)
                .map(m => m.mes)
                .join("\n");
            
            const count = context.getTokenCount(text) || 0;
            const el = document.getElementById('min-token-count');
            if (el) el.textContent = count.toLocaleString();
        } catch (e) {}
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
            if (e.type === 'touchmove') e.preventDefault();
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
        localStorage.setItem('minTokenPos_v2', JSON.stringify({ top: el.style.top, left: el.style.left }));
    }

    function loadPosition(el) {
        const saved = JSON.parse(localStorage.getItem('minTokenPos_v2') || '{}');
        if (saved.top && saved.left) {
            el.style.top = saved.top;
            el.style.left = saved.left;
        } else {
            el.style.top = '100px';
            el.style.left = '20px';
        }
    }

    // Если плашка случайно ушла за границы, возвращаем её
    function ensureVisible(el) {
        const rect = el.getBoundingClientRect();
        if (rect.top < 0 || rect.left < 0 || rect.top > window.innerHeight || rect.left > window.innerWidth) {
            el.style.top = '100px';
            el.style.left = '20px';
        }
    }

    // Инициализация при загрузке страницы
    if (document.readyState === 'complete') {
        createMinimalPanel();
    } else {
        window.addEventListener('load', createMinimalPanel);
    }
    
    // Резервный запуск через jQuery (SillyTavern это любит)
    jQuery(() => {
        setTimeout(createMinimalPanel, 1000);
    });
})();
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext()?.chat) {
                updateDisplay();
                clearInterval(check);
            }
        }, 1000);
        setInterval(updateDisplay, 3000);
    });
})();
