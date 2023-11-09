export abstract class BaseError extends Error {
  public readonly code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
    this.name = 'BaseError';
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class DuplicatedError extends BaseError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'DuplicatedError';
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class VerificationError extends BaseError {
  constructor(message: string, code = 500) {
    super(message, code || 500);
    this.name = 'UnauthorizedError';
  }
}
