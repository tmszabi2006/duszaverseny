import type { NextFunction, Request, RequestHandler, Response } from 'express';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function parseIdParam(raw: string): number {
  if (!/^[1-9][0-9]{0,9}$/.test(raw)) {
    throw new HttpError(400, 'Érvénytelen azonosító.');
  }
  return Number(raw);
}

export function bodyString(
  body: unknown,
  key: string,
  options: { required?: boolean; maxLength?: number; trim?: boolean } = {},
): string {
  const { required = false, maxLength = 5000, trim = true } = options;
  const value = (body as Record<string, unknown> | null | undefined)?.[key];
  if (value === undefined || value === null) {
    if (required) throw new HttpError(400, `Hiányzó mező: ${key}.`);
    return '';
  }
  if (typeof value !== 'string') {
    throw new HttpError(400, `A(z) ${key} mező szöveg kell legyen.`);
  }
  const result = trim ? value.trim() : value;
  if (required && result.length === 0) {
    throw new HttpError(400, `A(z) ${key} mező nem lehet üres.`);
  }
  if (result.length > maxLength) {
    throw new HttpError(400, `A(z) ${key} mező legfeljebb ${maxLength} karakter lehet.`);
  }
  return result;
}
