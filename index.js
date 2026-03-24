import { eventSource, event_types } from '../../../../script.js';
import { getContextSettings } from '../../../extensions.js';

let isDragging = false;
let startX, startY, initialLeft, initialTop;

// Создание панели
function createTokenPanel() {
    if (document.getElementById('simple-token-tracker')) return;

    const panel = document.createElement('div');
    panel.id = 'simple-token-tracker';
    panel.innerHTML = `
        <div class="tracker-label">TOKENS</div>
        <div id="tracker-values">0 / 0 (0%)</div>
    `;
    document.body.appendChild(panel);

    // Загрузка позиции
    const saved = localStorage.getItem('st_token_tracker_pos');
    if (saved) {
        const pos = JSON.parse(saved);
        panel.style.left = pos.left;
        panel.style.top = pos.top;
    } else {
        panel.style.right = '20px';
        panel.style.top = '100px';
    }

    setupDrag(panel);
    updateTokens();
}

function updateTokens() {
    const display = document.getElementById('tracker-values');
    if (!display) return;

    const settings = getContextSettings();
    const maxTokens = settings.context_length || 0;
    
    // Берем текущее количество токенов из интерфейса ST
    const tokenElement = document.getElementById('chat_token_count');
    let current = 0;
    if (tokenElement) {
        current = parseInt(tokenElement.innerText.replace(/\s/g, ''), 10) || 0;
    }

    const percent = maxTokens > 0 ? Math.round((current / maxTokens) * 100) : 0;
    display.innerText = `${current.toLocaleString('ru-RU')} / ${maxTokens.toLocaleString('ru-RU')} (${percent}%)`;
    
    // Подсветка при заполнении
    display.style.color = percent > 90 ? '#ff4444' : (percent > 75 ? '#ffaa44' : '#9ab4a5');
}

function setupDrag(el) {
    el.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = el.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        el.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        el.style.left = `${initialLeft + dx}px`;
        el.style.top = `${initialTop + dy}px`;
        el.style.right = 'auto';
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            el.style.cursor = 'grab';
            localStorage.setItem('st_token_tracker_pos', JSON.stringify({
                left: el.style.left,
                top: el.style.top
            }));
        }
    });
}

// Инициализация
jQuery(() => {
    createTokenPanel();
    eventSource.on(event_types.CHAT_CHANGED, updateTokens);
    eventSource.on(event_types.MESSAGE_RECEIVED, updateTokens);
    eventSource.on(event_types.MESSAGE_SENT, updateTokens);
    setInterval(updateTokens, 3000); // Резервное обновление
});
