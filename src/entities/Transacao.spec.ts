import { faker } from '@faker-js/faker';

import { Transacao } from './Transacao';

class SubTransacao extends Transacao {}

describe('Testa entidade Transacao', () => {
  const validSample = {
    destinatario: faker.string.uuid(),
    emissor: faker.string.uuid(),
    referencia: faker.string.sample(20),
    valor: faker.number.float({ min: 0, max: 100 }),
    descricao: faker.string.sample(),
  };

  it('deveria crar transacao a partir de um objeto', () => {
    const instancia = new SubTransacao(validSample);
    expect(instancia.data_emissao.getTime()).toBeLessThanOrEqual(Date.now());
    expect(instancia.descricao).toBe(validSample.descricao);
    expect(instancia.destinatario).toBe(validSample.destinatario);
    expect(instancia.emissor).toBe(validSample.emissor);
    expect(instancia.id).toBeUndefined();
    expect(instancia.referencia).toBe(validSample.referencia);
    expect(instancia.tipo).toBe(SubTransacao.name);
    expect(instancia.valor).toBe(validSample.valor);
  });

  it('deveria aceitar valores positivos', () => {
    expect(() => new SubTransacao({ ...validSample, valor: faker.number.int({ min: 1 }) })).not.toThrow();
    expect(() => new SubTransacao({ ...validSample, valor: faker.number.float({ min: 0.1 }) })).not.toThrow();
  });

  it('não deveria aceitar valores negativos', () => {
    expect(() => new SubTransacao({ ...validSample, valor: faker.number.int({ max: 0 }) })).toThrow();
    expect(() => new SubTransacao({ ...validSample, valor: faker.number.float({ max: 0 }) })).toThrow();
  });

  it('não deveria aceitar o valor zero', () => {
    expect(() => new SubTransacao({ ...validSample, valor: 0 })).toThrow();
  });
});
