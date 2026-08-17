'use client';

// client-side theme preferences stored in localStorage

export type ThemeMode = 'single' | 'system';
export type ThemeName = 'light' | 'dark';

const MODE_KEY = 'gitping_theme_mode';
const THEME_KEY = 'gitping_theme';

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  return localStorage.getItem(MODE_KEY) === 'single' ? 'single' : 'system';
}

export function getStoredTheme(): ThemeName {
  if (typeof window === 'undefined') return 'dark';
  return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
}

// resolve theme based on mode and OS preference
export function resolveTheme(mode: ThemeMode, theme: ThemeName): ThemeName {
  if (mode === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return 'dark';
  }
  return theme;
}

// apply data-theme attribute to root
export function applyTheme(mode: ThemeMode, theme: ThemeName): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', resolveTheme(mode, theme));
}

// save theme to localStorage and apply
export function persistTheme(mode: ThemeMode, theme: ThemeName): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MODE_KEY, mode);
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(mode, theme);
}
