// Після деплою старий chunk зник із CDN — вкладка з учорашнім index.html
// не може його завантажити (Б-15).
export function isStaleChunkError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /dynamically imported module|Importing a module script failed|Failed to fetch dynamically/i.test(msg);
}
