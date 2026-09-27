// Годинник співробітника може бігти не так, як серверний. Поправку беремо із
// заголовка Date кожної відповіді шлюзу й рахуємо SLA від серверного часу.

let offsetMs = 0;

export const serverClock = {
  /** Оновити поправку за заголовком Date відповіді. */
  observe(dateHeader: string | null, localNow: number = Date.now()): void {
    if (!dateHeader) return;
    const server = Date.parse(dateHeader);
    if (Number.isNaN(server)) return;
    offsetMs = server - localNow;
  },
  now(localNow: number = Date.now()): number {
    return localNow + offsetMs;
  },
  get offsetMs(): number {
    return offsetMs;
  },
  reset(): void {
    offsetMs = 0;
  },
};
