// ADR-5: access-токен живе лише в памʼяті вкладки. Жодного localStorage.
// Refresh-токен — HttpOnly-cookie, яку ставить шлюз; JS її не бачить.

let accessToken: string | null = null;

export const session = {
  get token(): string | null {
    return accessToken;
  },
  set(token: string | null): void {
    accessToken = token;
  },
};
