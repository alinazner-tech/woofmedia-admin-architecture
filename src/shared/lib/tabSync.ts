import type { QueryClient, QueryKey } from '@tanstack/react-query';

// Узгодженість між вкладками одного користувача (~30 рядків на BroadcastChannel).
// Між вкладками ходять лише КЛЮЧІ для інвалідації, а не дані: доступи до
// рекламних кабінетів не мають розповзатися по вкладках.

type Msg = { type: 'invalidate'; keys: QueryKey[] } | { type: 'logout' };

export interface TabSync {
  invalidate(keys: QueryKey[]): void;
  logout(): void;
  close(): void;
}

export function createTabSync(
  qc: QueryClient,
  onLogout: () => void,
  channelName = 'woof-sync',
): TabSync {
  if (typeof BroadcastChannel === 'undefined') {
    return { invalidate() {}, logout() {}, close() {} };
  }
  const ch = new BroadcastChannel(channelName);
  ch.onmessage = (e: MessageEvent<Msg>) => {
    const msg = e.data;
    if (msg.type === 'invalidate') {
      msg.keys.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
    } else if (msg.type === 'logout') {
      qc.clear();
      onLogout();
    }
  };
  return {
    invalidate: (keys) => ch.postMessage({ type: 'invalidate', keys } satisfies Msg),
    logout: () => ch.postMessage({ type: 'logout' } satisfies Msg),
    close: () => ch.close(),
  };
}

// Застосунок реєструє екземпляр при старті; модулі лише просять розіслати ключі.
let current: TabSync | null = null;
export function registerTabSync(t: TabSync | null): void {
  current = t;
}
export function broadcastInvalidate(keys: QueryKey[]): void {
  current?.invalidate(keys);
}
