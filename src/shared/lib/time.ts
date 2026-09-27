import { useSyncExternalStore } from 'react';
import { serverClock } from './serverClock';

// Один спільний таймер на застосунок, а не таймер на рядок черги (розділ 5).
// Хвилинної точності досить: пороги SLA — три години і нуль. При поверненні
// у вкладку — негайний перерахунок.

const STEP_MS = 60_000;
const listeners = new Set<() => void>();
let now = serverClock.now();
let timer: ReturnType<typeof setInterval> | null = null;

function tick() {
  now = serverClock.now();
  listeners.forEach((l) => l());
}

function onVisibility() {
  if (document.visibilityState === 'visible') tick();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    tick();
    timer = setInterval(tick, STEP_MS);
    document.addEventListener('visibilitychange', onVisibility);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
      document.removeEventListener('visibilitychange', onVisibility);
    }
  };
}

/** Поточний час за серверним годинником, оновлюється раз на хвилину. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, () => now);
}
