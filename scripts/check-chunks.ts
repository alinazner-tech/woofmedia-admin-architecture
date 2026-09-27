/**
 * Б-3а (ФЕ, рівень збірки): код фінансів, моніторингу й промптів
 * недосяжний зі статичного графа того, що вантажить спеціаліст.
 *
 * Читає dist/.vite/manifest.json після `vite build`. Запуск: node scripts/check-chunks.ts
 * Падає з кодом 1, якщо хоч один адмінський chunk потрапив у замикання
 * точки входу або робочих модулів, або якщо адмінський модуль перестав бути
 * окремим динамічним chunk.
 */
import { readFileSync } from 'node:fs';

type Chunk = { file: string; isEntry?: boolean; isDynamicEntry?: boolean; imports?: string[]; dynamicImports?: string[] };
const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf-8')) as Record<string, Chunk>;

const ADMIN = /src\/modules\/(finance|monitoring|prompts)\//;
const SPECIALIST_ROOTS = ['index.html', 'src/modules/queue/index.ts', 'src/modules/project/index.ts'];

function staticClosure(roots: string[]): Set<string> {
  const seen = new Set<string>();
  const stack = [...roots];
  while (stack.length) {
    const key = stack.pop()!;
    if (seen.has(key) || !manifest[key]) continue;
    seen.add(key);
    stack.push(...(manifest[key].imports ?? []));
  }
  return seen;
}

const problems: string[] = [];
const reachable = staticClosure(SPECIALIST_ROOTS);
const adminKeys = Object.keys(manifest).filter((k) => ADMIN.test(k));
const adminFiles = new Set(adminKeys.map((k) => manifest[k].file));

for (const key of reachable) {
  if (ADMIN.test(key) || adminFiles.has(manifest[key].file)) {
    problems.push(`адмінський код у графі спеціаліста: ${key} (${manifest[key].file})`);
  }
}
for (const key of ['finance', 'monitoring', 'prompts'].map((m) => `src/modules/${m}/index.ts`)) {
  if (!manifest[key]?.isDynamicEntry) problems.push(`${key} не є окремим динамічним chunk`);
}
for (const [key, chunk] of Object.entries(manifest)) {
  for (const imp of chunk.imports ?? []) {
    if (ADMIN.test(imp) && !ADMIN.test(key)) problems.push(`${key} статично імпортує адмінський ${imp}`);
  }
}

console.log('Статичне замикання спеціаліста:');
for (const key of [...reachable].sort()) console.log(`  ${manifest[key].file.padEnd(34)} ← ${key}`);
console.log('\nАдмінські chunk (лише за можливістю, динамічно):');
for (const key of adminKeys) console.log(`  ${manifest[key].file.padEnd(34)} ← ${key}`);

if (problems.length) {
  console.error(`\n✗ Б-3а порушено:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('\n✓ Б-3а: код фінансів, моніторингу й промптів недосяжний для спеціаліста.');
