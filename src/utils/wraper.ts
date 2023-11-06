import { NextFunction, Request, Response } from 'express';
import { BaseError } from './errors';

export function wraper<T>(action: (req: Request, res: Response, next?: NextFunction) => Promise<T>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<T | undefined> => {
    try {
      return await action(req, res);
    } catch (error) {
      if (error instanceof BaseError) {
        res.status(error.code).send({ message: error.message });
        return;
      }

      next(error);
    }
  };
}
