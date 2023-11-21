import compression from 'compression';
import consola from 'consola';
import cors from 'cors';
import express, { NextFunction, Request, Response, Router } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import { router } from './controllers/TransacaoController';
import { AppDataSource } from './data-source';
import { HttpError } from './utils/errors';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(helmet());
app.use(cors());
app.use(morgan(process.env.NODE_ENV === 'development' ? process.env.LOG_FORMAT : 'tiny'));

const PORT = process.env.PORT || 8080;
const definition = YAML.load('./docs.yaml');

definition.servers = [{ url: process.env.BASE_URL || `http://localhost:${PORT}/api` }];

app.use('/docs', swaggerUi.serve, swaggerUi.setup(definition));

const apiRouter = Router();
apiRouter.use('/transacoes', router());

app.use('/api', apiRouter);

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof HttpError) return res.status(error.code).json({ error: error.message });
  next(error);
});

AppDataSource.initialize().then(() =>
  app
    .listen(PORT, () => consola.success(`Server listening at http://localhost:${PORT}`))
    .on('close', () => AppDataSource.destroy()),
);
