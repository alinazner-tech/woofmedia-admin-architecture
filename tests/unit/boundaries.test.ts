// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';

// Б-8 (ФЕ): межі модулів. Правило oxlint no-restricted-imports (нуль нових залежностей).
// Навмисно порушені фікстури МАЮТЬ падати — інакше правило мовчки зламалося.

function lint(target: string): { code: number; out: string } {
  try {
    const out = execFileSync('npx', ['oxlint', '-c', '.oxlintrc.json', target], { encoding: 'utf-8', stdio: 'pipe' });
    return { code: 0, out };
  } catch (e) {
    const err = e as { status: number; stdout: string };
    return { code: err.status, out: err.stdout };
  }
}

describe('Б-8: межі модулів', () => {
  it('кожна навмисно порушена межа ловиться лінтером', () => {
    const { code, out } = lint('tests/lint-fixtures');
    expect(code).not.toBe(0);
    for (const file of [
      'shared/bad-domain.ts',
      'entities/project/bad-module.ts',
      'modules/queue/bad-cross.ts',
      'modules/finance/bad-entities.ts',
      'app/bad-static.ts',
    ]) {
      expect(out, `не спіймано: ${file}`).toMatch(new RegExp(`${file.replace('/', '\\/')}.*no-restricted-imports`));
    }
  });

  it('справжній код src не порушує жодної межі', () => {
    const { code, out } = lint('src');
    expect(out).not.toContain('no-restricted-imports');
    expect(code).toBe(0);
  });
}, 60_000);
