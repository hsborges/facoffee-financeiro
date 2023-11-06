import express, { Router } from 'express';
import consola from 'consola';
import compression from 'compression';
import helmet from 'helmet';

import { AppDataSource } from './data-source';

import transacaoRouter from './controllers/transacao.controller';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(helmet());

const apiRouter = Router();
apiRouter.use('/transacoes', transacaoRouter);

app.use('/api', apiRouter);

const PORT = process.env.PORT || 8080;

AppDataSource.initialize().then(() =>
  app
    .listen(PORT, () => consola.success(`Server listening at http://localhost:${PORT}`))
    .on('close', () => AppDataSource.destroy()),
);
