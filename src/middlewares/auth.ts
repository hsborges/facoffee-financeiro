import { NextFunction, Request, Response } from 'express';
import jsonwebtoken, { JwtPayload } from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';

import { UnauthorizedError } from '../utils/errors';

export interface KeycloakJwtPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  roles: string[];
  scope: string;
  sid: string;
  email_verified: boolean;
  name: string;
  preferred_username: string;
  given_name: string;
  family_name: string;
  email: string;
}

const client = jwksRsa({
  jwksUri: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`,
});

function getKey(header: any, callback: (err: Error | null, key?: string) => any) {
  client
    .getSigningKey(header.kid)
    .then((key) => callback(null, key.getPublicKey()))
    .catch(callback);
}

function verify(token: string) {
  return new Promise<KeycloakJwtPayload & JwtPayload>((resolve, reject) => {
    jsonwebtoken.verify(token, getKey, {}, function (err, decoded) {
      if (err) return reject(new UnauthorizedError(err.message || JSON.stringify(err)));
      return resolve(decoded as KeycloakJwtPayload & JwtPayload);
    });
  });
}

export function isAuthenticated() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      return verify(token)
        .then(({ realm_access, ...decoded }) => {
          req.user = { ...decoded, roles: realm_access.roles || [] };
          return next();
        })
        .catch((error) => next(error));
    }

    return next(new UnauthorizedError());
  };
}

export function hasRole(role: 'admin') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const callback: NextFunction = (error) => {
      if (error) return next(error);
      if (req.user?.roles.includes(role)) return next();
      return new UnauthorizedError();
    };

    return req.user ? callback() : isAuthenticated()(req, res, callback);
  };
}
