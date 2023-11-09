import { NextFunction, Request, Response } from 'express';

import { Keycloak } from 'keycloak-backend';
import { UnauthorizedError, VerificationError } from '../utils/errors';

const keycloak = new Keycloak({
  keycloak_base_url: process.env.KEYCLOAK_URL,
  realm: process.env.KEYCLOAK_REALM,
  client_id: process.env.KEYCLOAK_CLIENT_ID,
});

export function isAuthenticated() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    try {
      if (token) {
        const decoded = await keycloak.jwt.verify(token);
        if (!decoded.isExpired()) {
          req.user = decoded;
          return next();
        }
      }
    } catch (error: any) {
      if (error.response) {
        const { status, statusText } = error.response;
        return next(new VerificationError(statusText, status));
      }
    }

    return next(new UnauthorizedError());
  };
}

export function hasRole(role: 'admin') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const callback: NextFunction = (error) => {
      if (error) return next(error);
      if (req.user?.hasRealmRole(role)) return next();
      return new UnauthorizedError();
    };

    return req.user ? callback() : isAuthenticated()(req, res, callback);
  };
}
