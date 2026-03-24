import { eventSource, event_types } from '../../../../script.js';
import { getContextSettings } from '../../../extensions.js';

let trackerElement = null;

function createTrackerUI() {
    trackerElement = document.createElement('div');
    trackerElement.id = 'simple-token-tracker';
    trackerElement.innerHTML = `
        <div class="tracker-title">TOKENS:</div>
        <div class="tracker-values" id="tracker-token-values">0 / 0 (0%)</div>
    `;
    document.body.appendChild(trackerElement);
}

function updateTokenCount() {
    if (!trackerElement) return;

    // В SillyTavern количество токенов часто можно взять из стандартного UI
    // Или использовать встроенные методы расчета
    const maxTokens = getContextSettings().context_length || 0;
    
    // Пытаемся взять текущие токены из стандартного счетчика ST (если он включен)
    const currentTokensElement = document.getElementById('chat_token_count');
    let currentTokens = 0;
    
    if (currentTokensElement) {
        currentTokens = parseInt(currentTokensElement.innerText.replace(/\s/g, ''), 10) || 0;
    }

    let percentage = 0;
    if (maxTokens > 0) {
        percentage = Math.round((currentTokens / maxTokens) * 100);
    }

    const valuesDisplay = document.getElementById('tracker-token-values');
    if (valuesDisplay) {
        // Форматируем числа с пробелами (как на скрине: 6 258)
        const formatNum = (num) => num.toLocaleString('ru-RU');
        valuesDisplay.innerText = `${formatNum(currentTokens)} / ${formatNum(maxTokens)} (${percentage}%)`;
    }
}

// Инициализация при загрузке
jQuery(async () => {
    createTrackerUI();
    
    // Обновляем трекер при изменении чата или получении сообщения
    eventSource.on(event_types.CHAT_CHANGED, updateTokenCount);
    eventSource.on(event_types.MESSAGE_RECEIVED, updateTokenCount);
    eventSource.on(event_types.MESSAGE_SENT, updateTokenCount);
    
    // Первичное обновление
    setTimeout(updateTokenCount, 2000); 
});
