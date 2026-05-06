(function() {

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    let panelElement = null;
    let tokenValueSpan = null;
    let itemizedPromptsModule = null;

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

    function savePosition(el) {
        localStorage.setItem('tokenTracker_pos', JSON.stringify({
            top: el.style.top,
            left: el.style.left
        }));
    }

    function loadPosition(el) {
        const saved = JSON.parse(localStorage.getItem('tokenTracker_pos') || '{}');
        if (saved.top) el.style.top = saved.top;
        if (saved.left) el.style.left = saved.left;
    }

    async function calcTotalTokens(prompts) {
        if (!prompts || !prompts.length) return null;

        const last = prompts.reduce((a, b) => (a.mesId > b.mesId ? a : b), prompts[0]);
        if (!last || last.main_api !== 'openai') return null;

        const context = SillyTavern.getContext();
        const getTokenCountAsync = context.getTokenCountAsync;

        const beforeScenarioAnchorTokens = await getTokenCountAsync(last.beforeScenarioAnchor || '');
        const afterScenarioAnchorTokens = await getTokenCountAsync(last.afterScenarioAnchor || '');
        const worldInfoStringTokens = await getTokenCountAsync(last.worldInfoString || '');
        const examplesStringTokens = last.oaiExamplesTokens || 0;

        const oaiPromptTokens = (last.oaiPromptTokens || 0)
            - (afterScenarioAnchorTokens + beforeScenarioAnchorTokens)
            + examplesStringTokens;

        const total =
            (last.oaiStartTokens || 0) +
            oaiPromptTokens +
            (last.oaiMainTokens || 0) +
            (last.oaiNsfwTokens || 0) +
            (last.oaiBiasTokens || 0) +
            (last.oaiImpersonateTokens || 0) +
            (last.oaiJailbreakTokens || 0) +
            (last.oaiNudgeTokens || 0) +
            (last.oaiConversationTokens || 0) +
            worldInfoStringTokens +
            beforeScenarioAnchorTokens +
            afterScenarioAnchorTokens;

        return total > 0 ? total : null;
    }

    async function updateTokenCount() {
        if (!tokenValueSpan || !itemizedPromptsModule) return;

        try {
            const prompts = itemizedPromptsModule.itemizedPrompts;
            const total = await calcTotalTokens(prompts);
            if (total !== null) {
                tokenValueSpan.textContent = total.toLocaleString();
            } else {
                tokenValueSpan.textContent = '—';
            }
        } catch (err) {
            console.warn('Token Tracker: ошибка при чтении токенов', err);
        }
    }

    jQuery(async function() {
        createPanel();

        try {
            itemizedPromptsModule = await import('/scripts/itemized-prompts.js');
        } catch (err) {
            console.warn('Token Tracker: не удалось импортировать itemized-prompts.js', err);
            return;
        }

        const waitForST = setInterval(async () => {
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
                clearInterval(waitForST);

                const { eventSource, event_types } = SillyTavern.getContext();

                if (eventSource && event_types) {
                    eventSource.on(event_types.MESSAGE_RECEIVED, () => {
                        setTimeout(updateTokenCount, 1000);
                    });

                    eventSource.on(event_types.MESSAGE_SWIPED, () => {
                        setTimeout(updateTokenCount, 1000);
                    });

                    eventSource.on(event_types.CHAT_LOADED, () => {
                        setTimeout(updateTokenCount, 1500);
                    });

                    eventSource.on(event_types.CHAT_CHANGED, () => {
                        tokenValueSpan.textContent = '—';
                        setTimeout(updateTokenCount, 2000);
                    });
                }

                setTimeout(updateTokenCount, 1500);
            }
        }, 500);
    });

})();
