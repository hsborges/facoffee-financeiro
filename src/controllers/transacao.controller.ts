import { NextFunction, Request, Response, Router } from 'express';

import * as accountService from '../services/transacao.service';
import { upload } from '../utils/multer';
import { Schema, checkSchema, matchedData, validationResult } from 'express-validator';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

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

const router = Router();

router.get(
  '/:destinatario/saldo',
  validate({ destinatario: { isEmail: true, in: 'params' } }),
  async (req: Request<{ destinatario: string }>, res: Response) => {
    return res.json(await accountService.summaryByDestinatario(req.params.destinatario));
  },
);

router.get(
  '/:destinatario/extrato',
  validate({ destinatario: { isEmail: true, in: 'params' } }),
  async (req: Request<{ destinatario: string }>, res: Response) => {
    return res.json(await accountService.findByDestinatario(req.params.destinatario));
  },
);

router.post(
  '/:destinatario/credito',
  upload.single('comprovante'),
  validate(
    {
      destinatario: { isEmail: true, in: 'params' },
      valor: { isNumeric: true, in: 'body', toInt: true },
      referencia: { notEmpty: true, in: 'body' },
      emissor: { notEmpty: true, in: 'body' },
      comprovante: { notEmpty: true, in: 'body' },
      descricao: { optional: true, in: 'body' },
    },
    {
      onError: (_, req) => {
        if (!req.body.comprovante) return;
        const filePath = join('uploads', req.body.comprovante);
        return existsSync(filePath) && rmSync(filePath);
      },
    },
  ),
  async (req: Request<{ destinatario: string }>, res: Response) => {
    return res.json(await accountService.createDeposito(req.data));
  },
);

router.put(
  '/:destinatario/credito',
  validate({
    transacao: { isUUID: true, in: 'body' },
    status: { isString: true, in: 'body', isIn: { options: ['aprovado', 'rejeitado'] } },
    revisado_por: { isEmail: true, in: 'body' },
  }),
  async (req: Request, res: Response) => {
    const { transacao, ...data } = req.data;
    return res.json(await accountService.reviewDeposito(transacao, data));
  },
);

router.post(
  '/:destinatario/debito',
  validate({
    destinatario: { isEmail: true, in: 'params' },
    valor: { isNumeric: true, in: 'body', toInt: true },
    referencia: { notEmpty: true, in: 'body' },
    emissor: { notEmpty: true, in: 'body' },
    descricao: { optional: true, in: 'body' },
  }),
  async (req: Request, res: Response) => {
    return res.json(await accountService.createDebito(req.body));
  },
);

export default router;
