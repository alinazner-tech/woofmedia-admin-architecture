import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '../shared/api/errors';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Ретраї лише для мережі й 5xx; 4xx — відповідь, а не збій.
        retry: (count, err) => isApiError(err) && err.isServerSide && count < 2,
        refetchOnWindowFocus: true,
      },
    },
  });
}
