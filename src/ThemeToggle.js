import { useEffect, useRef, useState } from 'react';

const THEME_OVERRIDE_KEY = 'harish-theme-override';

function systemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function savedOverride() {
  try {
    const saved = window.sessionStorage.getItem(THEME_OVERRIDE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
}

export function useTheme() {
  const initialOverride = useRef(savedOverride());
  const followsSystem = useRef(!initialOverride.current);
  const [theme, setTheme] = useState(() => initialOverride.current || systemTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-color-scheme: dark)');
    const syncTheme = (event) => {
      if (followsSystem.current) setTheme(event.matches ? 'dark' : 'light');
    };

    preference.addEventListener('change', syncTheme);
    return () => preference.removeEventListener('change', syncTheme);
  }, []);

  const toggleTheme = () => {
    followsSystem.current = false;
    setTheme((current) => {
      const next = current === 'light' ? 'dark' : 'light';
      try {
        window.sessionStorage.setItem(THEME_OVERRIDE_KEY, next);
      } catch {
        // The toggle still works when storage is unavailable.
      }
      return next;
    });
  };

  return { theme, toggleTheme };
}

function ThemeToggle({ theme, onToggle }) {
  const nextTheme = theme === 'light' ? 'dark' : 'light';
  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      <span aria-hidden="true">{nextTheme === 'dark' ? '☾' : '☀︎'}</span>
    </button>
  );
}

export default ThemeToggle;
