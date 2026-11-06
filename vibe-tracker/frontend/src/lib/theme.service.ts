import { signal } from '@angular/core';

const darkSignal = signal<boolean>(getInitialValue());

function getInitialValue(): boolean {
  try {
    const stored = localStorage.getItem('vibe-ticket-tracker-theme');
    if (stored !== null) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

export function getIsDark(): boolean {
  return darkSignal();
}

export function setDark(dark: boolean): void {
  darkSignal.set(dark);
  document.documentElement.classList.toggle('dark', dark);
  try {
    localStorage.setItem('vibe-ticket-tracker-theme', dark ? 'dark' : 'light');
  } catch { /* noop */ }
}

export function toggleDark(): void {
  setDark(!getIsDark());
}
