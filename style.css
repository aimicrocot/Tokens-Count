.token-tracker-panel {
    position: fixed;
    top: 50px;
    left: 20px;
    z-index: 99999;

    /* Берём скругление у реальных блоков ST */
    border-radius: var(--border-radius-default, var(--border-radius, 8px));

    padding: 1px 6px;
    font-family: var(--mainFontFamily, 'Segoe UI', sans-serif);
    font-size: 13px;
    font-weight: 500;
    text-align: center;
    cursor: grab;
    user-select: none;
    letter-spacing: normal;
    transition: opacity 0.2s, transform 0.1s;

    /* Фон — цвет темы, но с фиксированной прозрачностью 0.55 поверх */
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor, #888) 55%, transparent);
    backdrop-filter: blur(calc(var(--SmartThemeBlurStrength, 1) * 12px));
    -webkit-backdrop-filter: blur(calc(var(--SmartThemeBlurStrength, 1) * 12px));

    color: var(--SmartThemeBodyColor, rgba(255, 255, 255, 0.85));

    /* Более заметная рамка — решает проблему со светлым фоном */
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor, #888) 60%, transparent);

    box-shadow: 0 4px 12px var(--SmartThemeShadowColor, rgba(0, 0, 0, 0.2));
}

.token-tracker-panel.dragging {
    cursor: grabbing;
    opacity: 0.85;
    transition: none;
    transform: scale(0.98);
}
