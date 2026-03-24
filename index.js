let isDragging = false;
let dragStartX, dragStartY, panelStartX, panelStartY, hasMoved = false;
let isCollapsed = false;
let contextReady = false;
let initializationRetries = 0;
let lastDisplayedTokenCount = -1;
let lastDisplayedTokenMethod = '';
let maxTokens = 50000;
let tokenMode = 'api'; // 'api' или 'chat'
let lastUsage = { prompt: 0, completion: 0, total: 0 };

function getChatIdentifier() {
    try {
        const context = typeof SillyTavern !== 'undefined' ? SillyTavern.getContext() : null;
        return context?.chatId || 'default';
    } catch (e) { return 'default'; }
}

function saveApiUsage(usage) {
    const chatId = getChatIdentifier();
    if (!chatId || chatId === 'default') return;
    localStorage.setItem('tokenTracker_apiUsage_' + chatId, JSON.stringify(usage));
}

function loadApiUsage() {
    const chatId = getChatIdentifier();
    const saved = localStorage.getItem('tokenTracker_apiUsage_' + chatId);
    lastUsage = saved ? JSON.parse(saved) : { prompt: 0, completion: 0, total: 0 };
}

// Перехват API запросов для получения точного количества токенов
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    const [url, options] = args;
    const urlString = String(url);
    const isGenerateRequest = urlString.includes('/generate') || urlString.includes('/chat/completions');

    let response = await originalFetch(...args);

    if (isGenerateRequest && response.ok) {
        handleFetchResponse(response.clone()).catch(() => {});
    }
    return response;
};

async function handleFetchResponse(response) {
    try {
        const data = await response.json();
        const usage = extractUsage(data);
        if (usage) {
            lastUsage.prompt = usage.prompt || 0;
            saveApiUsage(lastUsage);
            updateContextDisplay();
        }
    } catch (e) {}
}

function extractUsage(data) {
    if (!data || typeof data !== 'object') return null;
    let prompt = data.usage?.prompt_tokens || data.usageMetadata?.promptTokenCount || data.prompt_tokens || 0;
    return { prompt };
}

jQuery(async function() {
    loadMaxTokens();
    createTrackerPanel();
    loadState();
    await waitForSillyTavernReady();
    loadApiUsage();
    updateContextDisplay();
    setupEventListeners();
    setInterval(() => updateContextDisplay(), 3000);
});

function waitForSillyTavernReady() {
    return new Promise((resolve) => {
        const check = () => {
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext()?.chat) {
                contextReady = true; resolve();
            } else { setTimeout(check, 200); }
        };
        check();
    });
}

function createTrackerPanel() {
    if (document.getElementById('token-tracker-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'token-tracker-panel';
    panel.className = 'token-tracker-panel';

    panel.innerHTML = `
        <div class="tracker-header">
            <span class="tracker-icon">Tokens</span>
            <button class="tracker-toggle" id="tracker-toggle">▼</button>
        </div>
        <div class="tracker-content" id="tracker-content">
            <div id="stat-context" class="tokens-display">
                <div class="tokens-numbers"><span class="context-text">0 / 0</span></div>
                <div class="context-percent">(0%)</div>
            </div>
            <div class="mode-buttons">
                <button class="mode-btn ${tokenMode === 'chat' ? 'active' : ''}" data-mode="chat">CHAT</button>
                <button class="mode-btn ${tokenMode === 'api' ? 'active' : ''}" data-mode="api">API</button>
                <button class="edit-limit-btn" id="edit-limit-btn">✎</button>
            </div>
        </div>
    `;

    document.body.appendChild(panel);
    setupDraggable(panel);

    document.getElementById('tracker-toggle').onclick = (e) => { e.stopPropagation(); togglePanel(); };
    document.getElementById('edit-limit-btn').onclick = (e) => { e.stopPropagation(); openLimitEditor(); };
    
    panel.querySelectorAll('.mode-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            tokenMode = btn.dataset.mode;
            localStorage.setItem('tokenTrackerMode', tokenMode);
            panel.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateContextDisplay();
        };
    });
}

function updateContextDisplay() {
    let current = 0;
    if (tokenMode === 'api') {
        current = lastUsage.prompt || 0;
    } else {
        try {
            const context = SillyTavern.getContext();
            const visibleText = context.chat.filter(m => !m.extra?.hidden && !m.is_system).map(m => m.mes).join("\n");
            current = context.getTokenCount(visibleText) || 0;
        } catch (e) {}
    }

    const percentage = maxTokens > 0 ? Math.round((current / maxTokens) * 100) : 0;
    const el = document.getElementById('stat-context');
    if (!el) return;

    el.querySelector('.context-text').textContent = `${current.toLocaleString()} / ${maxTokens.toLocaleString()}`;
    const pEl = el.querySelector('.context-percent');
    pEl.textContent = `(${percentage}%)`;
    pEl.style.color = percentage >= 90 ? '#ff4444' : (percentage >= 75 ? '#ffaa44' : '');
}

function togglePanel() {
    isCollapsed = !isCollapsed;
    const panel = document.getElementById('token-tracker-panel');
    panel.classList.toggle('collapsed', isCollapsed);
    saveState();
}

function setupEventListeners() {
    const eventSource = SillyTavern.getContext()?.eventSource;
    if (!eventSource) return;
    const refresh = () => setTimeout(() => updateContextDisplay(), 500);
    eventSource.on('chat_changed', () => { loadApiUsage(); refresh(); });
    eventSource.on('generation_ended', refresh);
}

function openLimitEditor() {
    const newLimit = prompt("Введите лимит токенов (0-128000):", maxTokens);
    if (newLimit !== null) {
        const val = parseInt(newLimit);
        if (!isNaN(val) && val >= 0) {
            maxTokens = val;
            localStorage.setItem('tokenTrackerMaxTokens', maxTokens);
            updateContextDisplay();
        }
    }
}

function loadMaxTokens() {
    maxTokens = parseInt(localStorage.getItem('tokenTrackerMaxTokens')) || 50000;
    tokenMode = localStorage.getItem('tokenTrackerMode') || 'api';
}

function saveState() {
    const panel = document.getElementById('token-tracker-panel');
    const rect = panel.getBoundingClientRect();
    const state = { 
        collapsed: isCollapsed, 
        top: panel.style.top, 
        left: panel.style.left, 
        right: panel.style.right 
    };
    localStorage.setItem('tokenTracker_pos', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('tokenTracker_pos');
    if (!saved) return;
    const state = JSON.parse(saved);
    const panel = document.getElementById('token-tracker-panel');
    isCollapsed = state.collapsed;
    panel.classList.toggle('collapsed', isCollapsed);
    if (state.top) panel.style.top = state.top;
    if (state.left) panel.style.left = state.left;
    if (state.right) panel.style.right = state.right;
}

function setupDraggable(el) {
    el.onmousedown = (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        dragStartX = e.clientX; dragStartY = e.clientY;
        const rect = el.getBoundingClientRect();
        panelStartX = rect.left; panelStartY = rect.top;
        
        document.onmousemove = (e) => {
            if (!isDragging) return;
            el.style.left = (panelStartX + (e.clientX - dragStartX)) + 'px';
            el.style.top = (panelStartY + (e.clientY - dragStartY)) + 'px';
            el.style.right = 'auto';
        };
        document.onmouseup = () => { isDragging = false; document.onmousemove = null; saveState(); };
    };
}
