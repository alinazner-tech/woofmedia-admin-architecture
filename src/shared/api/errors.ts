// RFC 9457 problem+json, контракт А-14. shared нічого не знає про домен,
// тому currentStatus тут — просто рядок.
export interface Problem {
  type?: string;
  title: string;
  status: number;
  code: string;
  service?: string;
  requestId?: string;
  currentStatus?: string;
}

/**
 * Єдиний тип помилки, з яким працює UI.
 * status 0 — запит не дійшов: мережа, таймаут або лежить шлюз.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly service?: string;
  readonly requestId?: string;
  readonly currentStatus?: string;

  constructor(p: Problem) {
    super(p.title);
    this.name = 'ApiError';
    this.status = p.status;
    this.code = p.code;
    this.service = p.service;
    this.requestId = p.requestId;
    this.currentStatus = p.currentStatus;
  }

  get isUnreachable(): boolean {
    return this.status === 0;
  }

  get isServerSide(): boolean {
    return this.status >= 500 || this.status === 0;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}
