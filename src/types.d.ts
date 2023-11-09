import { Token } from 'keycloak-backend';

// to make the file a module and avoid the TypeScript error
export {};

declare global {
  namespace Express {
    export interface Request {
      data: any;
      user?: Token;
    }
  }

  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'prodroduction';
      PORT: string;
      BASE_URL: string;
      KEYCLOAK_URL: string;
      KEYCLOAK_REALM: string;
      KEYCLOAK_CLIENT_ID: string;
      LOG_FORMAT: string;
    }
  }
}
