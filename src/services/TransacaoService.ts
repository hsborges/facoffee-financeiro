import { Repository } from 'typeorm';

import { AppDataSource } from '../data-source';
import { Credito } from '../entities/Credito';
import { Debito } from '../entities/Debito';
import { Transacao } from '../entities/Transacao';
import { NotFoundError } from '../utils/errors';

type TTransacao = ConstructorParameters<typeof Transacao>[0];
type TDeposito = ConstructorParameters<typeof Credito>[0];

export class TransacaoService {
  private readonly repository: Repository<Transacao>;

  constructor(repository: Repository<Transacao> = AppDataSource.getRepository(Transacao)) {
    this.repository = repository;
  }

  async creditar(deposito: TDeposito) {
    return this.repository.save(new Credito(deposito));
  }

  async debitar(debito: TTransacao) {
    return this.repository.save(new Debito(debito));
  }

  async revisar(id: string, revisao: { status: 'aprovado' | 'rejeitado'; revisado_por: string }) {
    const deposito = (await this.repository.findOneBy({ id })) as Credito | null;
    if (!deposito) throw new NotFoundError('Depósito não encontrado');
    return this.repository.save(deposito.revisar(revisao.status, revisao.revisado_por));
  }

  async buscarPorDestinatario(id: string): Promise<Transacao[]> {
    return this.repository.findBy({ destinatario: id });
  }

  async resumoPorDestinatario(id: string): Promise<{ saldo: number; pendente: 0 }> {
    return this.repository.findBy({ destinatario: id }).then((transacoes) => {
      return transacoes.reduce(
        (acc, curr) => {
          if (curr instanceof Credito) {
            if (curr.status === 'aprovado') acc.saldo += curr.valor;
            else if (curr.status === 'pendente') acc.pendente += curr.valor;
          } else if (curr instanceof Debito) {
            acc.saldo -= curr.valor;
          }
          return acc;
        },
        { saldo: 0, pendente: 0 },
      );
    });
  }
}
