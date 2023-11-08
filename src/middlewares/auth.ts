import { NextFunction, Request, Response } from 'express';

import { Keycloak } from 'keycloak-backend';

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
        return res.status(status).json({ message: statusText });
      }
    }

    return res.status(401).json({ message: 'Unauthorized' });
  };
}

export function hasPermission(owner?: (req: Request) => string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const callback: NextFunction = (error) => {
      if (error) return next(error);
      if (req.user?.hasRealmRole('admin')) return next();
      if (owner && req.user?.content.sub === owner(req)) return next();
      return res.status(401).json({ message: 'Unauthorized' });
    };

    return req.user ? callback() : isAuthenticated()(req, res, callback);
  };
}
