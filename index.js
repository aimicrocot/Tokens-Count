(function() {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    let isCollapsed = false;
    let contextReady = false;
    let lastUsage = { prompt: 0 };
    let maxTokens = parseInt(localStorage.getItem('tokenTrackerMaxTokens')) || 50000;
    let tokenMode = localStorage.getItem('tokenTrackerMode') || 'api';

    // 1. Перехват API для точного счета
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        const [url] = args;
        const isGen = String(url).includes('/generate') || String(url).includes('/chat/completions');
        const response = await originalFetch(...args);
        if (isGen && response.ok) {
            try {
                const clone = response.clone();
                const data = await clone.json();
                lastUsage.prompt = data.usage?.prompt_tokens || data.usageMetadata?.promptTokenCount || data.prompt_tokens || 0;
                localStorage.setItem('tokenTracker_lastApi_' + (SillyTavern.getContext()?.chatId || 'default'), JSON.json(lastUsage));
                updateDisplay();
            } catch (e) {}
        }
        return response;
    };

    // 2. Создание интерфейса
    function createPanel() {
        if (document.getElementById('token-tracker-panel')) return;
        const panel = document.createElement('div');
        panel.id = 'token-tracker-panel';
        panel.className = 'token-tracker-panel';
        panel.innerHTML = `
            <div class="tracker-header" id="tracker-drag-handle">
                <span class="tracker-title">Tokens</span>
                <button id="tracker-toggle-btn">▼</button>
            </div>
            <div class="tracker-content" id="tracker-content">
                <div class="tokens-display">
                    <div class="tokens-numbers"><span id="tokens-val">0 / 0</span></div>
                    <div id="tokens-pct" class="context-percent">(0%)</div>
                </div>
                <div class="mode-buttons">
                    <button class="mode-btn ${tokenMode === 'chat' ? 'active' : ''}" data-mode="chat">CHAT</button>
                    <button class="mode-btn ${tokenMode === 'api' ? 'active' : ''}" data-mode="api">API</button>
                    <button id="tracker-edit-limit">✎</button>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        setupDraggable(panel);
        loadPosition(panel);

        document.getElementById('tracker-toggle-btn').onclick = (e) => { e.stopPropagation(); toggleCollapse(panel); };
        document.getElementById('tracker-edit-limit').onclick = (e) => { e.stopPropagation(); editLimit(); };
        
        panel.querySelectorAll('.mode-btn').forEach(btn => {
            btn.onclick = (e) => {
                tokenMode = btn.dataset.mode;
                localStorage.setItem('tokenTrackerMode', tokenMode);
                panel.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateDisplay();
            };
        });
    }

    // 3. Логика перетаскивания (Исправленная)
    function setupDraggable(el) {
        const onStart = (e) => {
            if (e.target.closest('button')) return;
            isDragging = true;
            el.classList.add('dragging');
            const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
            startX = clientX;
            startY = clientY;
            const rect = el.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            el.style.right = 'auto'; // Сброс для корректного движения
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

    // 4. Функции обновления
    function updateDisplay() {
        let current = 0;
        if (tokenMode === 'api') {
            current = lastUsage.prompt || 0;
        } else {
            try {
                const context = SillyTavern.getContext();
                const text = context.chat.filter(m => !m.extra?.hidden && !m.is_system).map(m => m.mes).join("\n");
                current = context.getTokenCount(text) || 0;
            } catch (e) {}
        }
        const pct = maxTokens > 0 ? Math.round((current / maxTokens) * 100) : 0;
        const valEl = document.getElementById('tokens-val');
        const pctEl = document.getElementById('tokens-pct');
        if (valEl) valEl.textContent = `${current.toLocaleString()} / ${maxTokens.toLocaleString()}`;
        if (pctEl) {
            pctEl.textContent = `(${pct}%)`;
            pctEl.style.color = pct >= 90 ? '#ff4444' : (pct >= 75 ? '#ffaa44' : '');
        }
    }

    function toggleCollapse(panel) {
        isCollapsed = !isCollapsed;
        panel.classList.toggle('collapsed', isCollapsed);
        localStorage.setItem('tokenTracker_collapsed', isCollapsed);
    }

    function editLimit() {
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
