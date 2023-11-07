import express, { Router } from 'express';
import consola from 'consola';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import { AppDataSource } from './data-source';

import transacaoRouter from './controllers/transacao.controller';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(helmet());
app.use(cors());

const PORT = process.env.PORT || 8080;
const definition = YAML.load('./docs.yaml');

definition.servers = [{ url: process.env.BASE_URL || `http://localhost:${PORT}/api` }];

app.use('/docs', swaggerUi.serve, swaggerUi.setup(definition));

const apiRouter = Router();
apiRouter.use('/transacoes', transacaoRouter);

app.use('/api', apiRouter);

AppDataSource.initialize().then(() =>
  app
    .listen(PORT, () => consola.success(`Server listening at http://localhost:${PORT}`))
    .on('close', () => AppDataSource.destroy()),
);
