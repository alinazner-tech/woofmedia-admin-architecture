// Можливості приходять із /me пласким списком. Клієнт не виводить права
// з назви ролі. Це керує лише тим, що показати й що завантажити — дані захищає шлюз.

export function makeCan<C extends string>(capabilities: readonly C[]) {
  const set = new Set<string>(capabilities);
  return (c: C | null): boolean => c === null || set.has(c);
}
