import { NextFunction, Request, Response, Router } from 'express';
import { Schema, checkSchema, matchedData, validationResult } from 'express-validator';
import { writeFileSync } from 'fs';
import { join } from 'path';

import { hasRole, isAuthenticated } from '../middlewares/auth';
import { upload } from '../middlewares/multer';
import { TransacaoService } from '../services/TransacaoService';
import { ServerError, UnauthorizedError } from '../utils/errors';

const validate = (schema: Schema, opts?: { onError: (error: Error, req: Request) => any }) => {
  return [
    ...checkSchema(schema),
    (req: Request, res: Response, next: NextFunction) => {
      const result = validationResult(req);
      req.data = matchedData(req);
      if (result.isEmpty()) return next();
      try {
        result.throw();
      } catch (error: any) {
        opts?.onError(error, req);
        res.status(400).json({ errors: result.array() });
      }
    },
  ];
};

export const createRouter = (service: TransacaoService = new TransacaoService()) => {
  const router = Router();

  router.get(
    '/saldo',
    isAuthenticated(),
    validate({ destinatario: { isUUID: true, in: 'query', optional: true } }),
    async (req: Request<{ destinatario: string }>, res: Response, next: NextFunction) => {
      if (req.query.destinatario && !req.user?.roles.includes('admin')) return next(new UnauthorizedError());
      const id = (req.query.destinatario ? req.query.destinatario : req.user?.sub) as string;
      return res.json(await service.resumoPorDestinatario(id));
    },
  );

  router.get(
    '/extrato',
    isAuthenticated(),
    validate({ destinatario: { isUUID: true, in: 'query', optional: true } }),
    async (req: Request<{ destinatario: string }>, res: Response, next: NextFunction) => {
      if (req.query.destinatario && !req.user?.roles.includes('admin')) return next(new UnauthorizedError());
      return res.json(await service.buscarPorDestinatario(req.params.destinatario));
    },
  );

  router.post(
    '/credito',
    isAuthenticated(),
    upload.single('comprovante'),
    validate({
      destinatario: { isUUID: true, in: 'body', optional: true },
      valor: { isNumeric: true, in: 'body', toFloat: true, custom: { options: (value) => value > 0 } },
      referencia: { notEmpty: true, in: 'body' },
      comprovante: {
        custom: {
          options: (value, { req }) => !!req.file,
          errorMessage: 'O campo comprovante é obrigatório',
        },
      },
      descricao: { optional: true, in: 'body' },
    }),
    async (req: Request<{ destinatario: string }>, res: Response) => {
      return res.status(201).json(
        await service.creditar({
          ...req.data,
          destinatario: req.data.destinatario || req.user?.sub,
          emissor: req.user?.sub,
          comprovante: { name: req.file?.originalname, data: req.file?.buffer },
        }),
      );
    },
  );

  router.patch(
    '/credito/:transacao',
    isAuthenticated(),
    hasRole('admin'),
    validate({
      transacao: { isUUID: true, in: 'params' },
      status: { isString: true, in: 'body', isIn: { options: [['aprovado', 'rejeitado']] } },
    }),
    async (req: Request, res: Response) => {
      req.data.revisado_por = req.user?.sub;
      const { transacao, ...data } = req.data;
      return res.json(await service.revisar(transacao, data));
    },
  );

  router.post(
    '/debito',
    isAuthenticated(),
    hasRole('admin'),
    validate({
      destinatario: { isUUID: true, in: 'body' },
      valor: { isNumeric: true, in: 'body', toFloat: true, custom: { options: (value) => value > 0 } },
      referencia: { notEmpty: true, in: 'body' },
      descricao: { optional: true, in: 'body' },
    }),
    async (req: Request, res: Response) => {
      return res.status(201).json(await service.debitar({ ...req.data, emissor: req.user?.sub }));
    },
  );

  return router;
};
