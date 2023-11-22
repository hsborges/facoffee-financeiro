import { faker } from '@faker-js/faker';
import { StatusCodes } from 'http-status-codes';
import { JsonWebTokenError, JwtPayload } from 'jsonwebtoken';
import supertest from 'supertest';
import { FileResult, file } from 'tmp-promise';

import { createApp } from '../app';
import { AppDataSource } from '../utils/data-source';
import { createRouter } from './TransacaoController';

function fakeJwtPayload(data: Partial<{ sub: string; roles: Array<string> }> = {}): JwtPayload {
  const uId = data.sub || faker.string.uuid();
  return {
    iss: faker.internet.url(),
    sub: uId,
    aud: faker.internet.url(),
    exp: faker.number.int(),
    nbf: faker.number.int(),
    iat: faker.number.int(),
    jti: faker.string.uuid(),
    realm_access: { roles: data.roles || [] },
    scope: 'openid',
    sid: uId,
    email_verified: faker.datatype.boolean(),
    name: faker.person.fullName(),
    preferred_username: faker.internet.userName(),
    given_name: faker.person.firstName(),
    family_name: faker.person.lastName(),
    email: faker.internet.email(),
  };
}

const fakeUser = fakeJwtPayload();
const fakeAdmin = fakeJwtPayload({ roles: ['admin'] });

jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'),
  verify: jest.fn((token, secretOrPublicKey, options, callback) => {
    if (token === 'valid-token') return callback(null, fakeUser);
    else if (token === 'valid-token-admin') return callback(null, fakeAdmin);
    return callback(new JsonWebTokenError('Invalid token'));
  }),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
}));

describe('Testa o controller de transações', () => {
  const app = createApp([{ path: '/', router: createRouter() }]);

  const caminhos = {
    '/saldo': () => supertest(app).get('/saldo'),
    '/extrato': () => supertest(app).get('/extrato'),
    '/credito': () => supertest(app).post('/credito'),
    '/credito/:id': (id?: string) => supertest(app).patch(`/credito/${id || faker.string.uuid()}`),
    '/debito': () => supertest(app).post('/debito'),
  };

  beforeAll(async () => AppDataSource.initialize());
  afterAll(async () => AppDataSource.destroy());

  afterEach(async () => AppDataSource.dropDatabase().then(() => AppDataSource.synchronize()));

  describe('Verifica autenticação das rotas', () => {
    it('deve retornar 401 se nenhum token for fornecido', async () => {
      for (const test of Object.values(caminhos)) {
        await test().expect(StatusCodes.UNAUTHORIZED);
      }
    });

    it('deve retornar 401 se token invalido for fornecido', async () => {
      for (const test of Object.values(caminhos)) {
        await test().auth(faker.string.alphanumeric(100), { type: 'bearer' }).expect(StatusCodes.UNAUTHORIZED);
      }
    });
  });

  describe('Verifica a rota GET /saldo', () => {
    it('deve retornar 200 com o saldo do usuário', async () => {
      await caminhos['/saldo']()
        .auth('valid-token', { type: 'bearer' })
        .expect(StatusCodes.OK)
        .expect({ saldo: 0, pendente: 0 });
    });

    it('deve permitir consultar saldo de outros usuários se admin', async () => {
      await caminhos['/saldo']()
        .query({ destinatario: faker.string.uuid() })
        .auth('valid-token-admin', { type: 'bearer' })
        .expect(StatusCodes.OK)
        .expect({ saldo: 0, pendente: 0 });

      await caminhos['/saldo']()
        .query({ destinatario: faker.string.uuid() })
        .auth('valid-token', { type: 'bearer' })
        .expect(StatusCodes.UNAUTHORIZED);
    });

    it('deve retornar 400 se o destinatário não for um uuid', async () => {
      await caminhos['/saldo']()
        .query({ destinatario: faker.string.sample(36) })
        .auth('valid-token-admin', { type: 'bearer' })
        .expect(StatusCodes.BAD_REQUEST);
    });
  });

  describe('Verifica a rota GET /extrato', () => {
    it('deve retornar 200 com o extrato do usuário', async () => {
      await caminhos['/extrato']().auth('valid-token', { type: 'bearer' }).expect(StatusCodes.OK).expect([]);
    });

    it('deve permitir obter extrato de outros usuários se admin', async () => {
      await caminhos['/extrato']()
        .query({ destinatario: faker.string.uuid() })
        .auth('valid-token-admin', { type: 'bearer' })
        .expect(StatusCodes.OK)
        .expect([]);

      await caminhos['/extrato']()
        .query({ destinatario: faker.string.uuid() })
        .auth('valid-token', { type: 'bearer' })
        .expect(StatusCodes.UNAUTHORIZED);
    });

    it('deve retornar 400 se o destinatário não for um uuid', async () => {
      await caminhos['/extrato']()
        .query({ destinatario: faker.string.sample(36) })
        .auth('valid-token-admin', { type: 'bearer' })
        .expect(StatusCodes.BAD_REQUEST);
    });
  });

  describe('Verifica a rota POST /debito', () => {
    const validDebitoData = {
      destinatario: faker.string.uuid(),
      valor: faker.number.float(),
      referencia: faker.string.hexadecimal(),
      descricao: faker.lorem.sentence(),
    };

    it('deve permitir somente usuários admin', async () => {
      await caminhos['/debito']()
        .auth('valid-token', { type: 'bearer' })
        .send(validDebitoData)
        .expect(StatusCodes.UNAUTHORIZED);
    });

    it('deve fazer a validação dos dados recebidos', async () => {
      const sendRequest = async (data: any) =>
        caminhos['/debito']().auth('valid-token-admin', { type: 'bearer' }).send(data).expect(StatusCodes.BAD_REQUEST);

      await sendRequest({ ...validDebitoData, destinatario: undefined });
      await sendRequest({ ...validDebitoData, destinatario: faker.string.sample(36) });
      await sendRequest({ ...validDebitoData, valor: undefined });
      await sendRequest({ ...validDebitoData, valor: -faker.number.float() });
      await sendRequest({ ...validDebitoData, referencia: undefined });
    });

    it('deve gerar debito para usuário', async () => {
      let debito: Record<string, any> | null = null;

      await caminhos['/debito']()
        .auth('valid-token-admin', { type: 'bearer' })
        .send(validDebitoData)
        .expect(StatusCodes.OK)
        .expect(({ body }) => {
          debito = body;
          expect(body).toHaveProperty('id');
          expect(body).toHaveProperty('destinatario', validDebitoData.destinatario);
          expect(body).toHaveProperty('emissor', fakeAdmin.sub);
          expect(body).toHaveProperty('valor', validDebitoData.valor);
          expect(body).toHaveProperty('referencia', validDebitoData.referencia);
          expect(body).toHaveProperty('descricao', validDebitoData.descricao);
        });

      await caminhos['/saldo']()
        .auth('valid-token-admin', { type: 'bearer' })
        .query({ destinatario: validDebitoData.destinatario })
        .expect(StatusCodes.OK, { saldo: -validDebitoData.valor, pendente: 0 });

      await caminhos['/extrato']()
        .auth('valid-token-admin', { type: 'bearer' })
        .query({ destinatario: validDebitoData.destinatario })
        .expect(StatusCodes.OK, [debito]);
    });
  });

  describe('Verifica a rota POST /credito', () => {
    let tmpFile: FileResult | null = null;

    const validDebitoData: Record<string, any> = {
      destinatario: faker.string.uuid(),
      valor: faker.number.float(),
      referencia: faker.string.hexadecimal(),
      descricao: faker.lorem.sentence(),
    };

    beforeAll(async () => (tmpFile = await file({ postfix: '.pdf' })));
    afterAll(async () => tmpFile?.cleanup());

    it('deve fazer a validação dos dados recebidos', async () => {
      const sendRequest = async (data: Record<string, any>, attach = true) => {
        let req = caminhos['/credito']().auth('valid-token-admin', { type: 'bearer' });

        if (attach) req.attach('comprovante', tmpFile?.path || '');

        for (const [key, value] of Object.entries(data)) {
          if (value) req = req.field(key, value);
        }

        return req.expect(StatusCodes.BAD_REQUEST);
      };

      await sendRequest({ ...validDebitoData, destinatario: faker.string.sample(36) });
      await sendRequest({ ...validDebitoData, valor: undefined });
      await sendRequest({ ...validDebitoData, valor: -faker.number.float() });
      await sendRequest({ ...validDebitoData, referencia: undefined });
      await sendRequest(validDebitoData, false);
    });

    it('deve gerar credito para usuário', async () => {
      let credito: Record<string, any> | null = null;

      await caminhos['/credito']()
        .auth('valid-token', { type: 'bearer' })
        .field('valor', validDebitoData.valor)
        .field('referencia', validDebitoData.referencia)
        .field('descricao', validDebitoData.descricao)
        .attach('comprovante', tmpFile?.path || '')
        .expect(StatusCodes.OK)
        .expect(({ body }) => {
          credito = body;
          expect(body).toHaveProperty('id');
          expect(body).toHaveProperty('destinatario', fakeUser.sub);
          expect(body).toHaveProperty('emissor', fakeUser.sub);
          expect(body).toHaveProperty('valor', validDebitoData.valor);
          expect(body).toHaveProperty('referencia', validDebitoData.referencia);
          expect(body).toHaveProperty('descricao', validDebitoData.descricao);
        });

      await caminhos['/saldo']()
        .auth('valid-token', { type: 'bearer' })
        .expect(StatusCodes.OK, { saldo: 0, pendente: validDebitoData.valor });

      await caminhos['/extrato']().auth('valid-token', { type: 'bearer' }).expect(StatusCodes.OK, [credito]);
    });
  });
});
