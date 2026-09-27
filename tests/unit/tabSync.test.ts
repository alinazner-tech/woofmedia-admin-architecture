import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { createTabSync } from '../../src/shared/lib/tabSync';

// Б-10, Б-11 на рівні механізму: дві «вкладки» — два QueryClient на одному каналі.
// Повний сценарій у двох справжніх вкладках — e2e/tabs.spec.ts.

const tick = () => new Promise((r) => setTimeout(r, 20));

describe('Узгодженість вкладок', () => {
  it('Б-11: мутація в одній вкладці інвалідовує ті самі ключі в іншій (без передачі даних)', async () => {
    const tab1 = new QueryClient();
    const tab2 = new QueryClient();
    const spy = vi.spyOn(tab2, 'invalidateQueries');
    const a = createTabSync(tab1, () => {}, 'test-sync-1');
    const b = createTabSync(tab2, () => {}, 'test-sync-1');

    a.invalidate([['projects', 'list']]);
    await tick();
    expect(spy).toHaveBeenCalledWith({ queryKey: ['projects', 'list'] });
    a.close(); b.close();
  });

  it('Б-10: вихід в одній вкладці очищує кеш і розлогінює всі інші', async () => {
    const tab1 = new QueryClient();
    const tab2 = new QueryClient();
    tab2.setQueryData(['projects', 'detail', 'p-101', 'credentials'], [{ secret: 'X' }]);
    const onLogout = vi.fn();
    const a = createTabSync(tab1, () => {}, 'test-sync-2');
    const b = createTabSync(tab2, onLogout, 'test-sync-2');

    a.logout();
    await tick();
    expect(onLogout).toHaveBeenCalledOnce();
    expect(tab2.getQueryCache().getAll()).toHaveLength(0);
    a.close(); b.close();
  });
});
