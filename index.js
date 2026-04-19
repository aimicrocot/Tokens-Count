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

// Подсчёт токенов напрямую из itemizedParams
// Подсчёт токенов с помощью динамического импорта
async function updateTokenCount() {
    if (!tokenValueSpan) return;

    try {
        // Динамически подгружаем модуль. Это обходит блокировку обычного import.
        const { itemizedParams } = await import('../../../itemized-prompts.js');
        
        // Вызываем функцию
        const params = await itemizedParams();
        
        if (params && params.totalTokensInPrompt) {
            tokenValueSpan.textContent = Number(params.totalTokensInPrompt).toLocaleString();
        } else {
            // Если функция отработала, но данных нет
            tokenValueSpan.textContent = '0 (пусто)';
        }
    } catch (err) {
        console.error('Token Tracker: Ошибка импорта или выполнения', err);
        // Выводим ошибку прямо на плашку, чтобы сразу её увидеть
        tokenValueSpan.textContent = 'Ошибка'; 
    }
}

// Инициализация
jQuery(function() {
    createPanel();

    // Подписываемся на системные события SillyTavern для мгновенного обновления
    $(document).on('token_count_updated', updateTokenCount);
    $(document).on('v_char_selected', updateTokenCount);

    // Подстраховка (на случай если события не сработают)
    setInterval(updateTokenCount, 3000);

    // Первый запуск
    setTimeout(updateTokenCount, 1000);
});
