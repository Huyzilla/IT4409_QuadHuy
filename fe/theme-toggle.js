const THEME_KEY = 'traffic-monitor-theme';
const LIGHT_THEME_CLASS = 'theme-light';
const DARK_THEME_CLASS = 'theme-dark';

function getInitialTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
        return savedTheme;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return LIGHT_THEME_CLASS;
    }
    return DARK_THEME_CLASS;
}

function applyTheme(themeClass) {
    const body = document.body;
    body.classList.remove(LIGHT_THEME_CLASS, DARK_THEME_CLASS);
    body.classList.add(themeClass);
    localStorage.setItem(THEME_KEY, themeClass);
}

function toggleTheme() {
    const body = document.body;
    const isLight = body.classList.contains(LIGHT_THEME_CLASS);
    const newTheme = isLight ? DARK_THEME_CLASS : LIGHT_THEME_CLASS;
    applyTheme(newTheme);
}

export function initThemeToggle() {
    const toggleButton = document.querySelector('.theme-toggle-btn');

    applyTheme(getInitialTheme());

    if (toggleButton) {
        toggleButton.addEventListener('click', toggleTheme);
    }
}