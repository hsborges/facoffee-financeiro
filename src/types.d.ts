import { KeycloakJwtPayload } from './middlewares/auth';

// to make the file a module and avoid the TypeScript error
export {};

declare global {
  namespace Express {
    export interface Request {
      data: any;
      user?: KeycloakJwtPayload;
    }
  }

  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'prodroduction' | 'test';
      PORT: string;
      BASE_URL: string;
      KEYCLOAK_URL: string;
      KEYCLOAK_REALM: string;
      KEYCLOAK_CLIENT_ID: string;
      LOG_FORMAT?: string;
      DATA_DIR?: string;
    }
  }
}
