import { Transacao } from '../entities/Transacao';
import { NotFoundError } from '../utils/errors';
import { Credito } from '../entities/Credito';
import { AppDataSource } from '../data-source';
import { Debito } from '../entities/Debito';

type ITransacao = {
  valor: number;
  referencia: string;
  emissor: string;
  destinatario: string;
  descricao?: string;
};

type IDeposito = ITransacao & {
  comprovante: string;
};

const transacaoRepository = AppDataSource.getRepository(Transacao);
const creditoRepository = AppDataSource.getRepository(Credito);
const debitoRepository = AppDataSource.getRepository(Debito);

export async function findByDestinatario(id: string): Promise<Transacao[]> {
  return transacaoRepository.findBy({ destinatario: id });
}

export async function createDeposito(deposito: IDeposito) {
  return creditoRepository.save(creditoRepository.create(deposito));
}

export async function createDebito(debito: ITransacao) {
  return debitoRepository.save(debitoRepository.create(debito));
}

export async function reviewDeposito(id: string, revisao: { status: 'aprovado' | 'rejeitado'; revisado_por: string }) {
  const deposito = await creditoRepository.findOneBy({ id });
  if (!deposito) throw new NotFoundError('Depósito não encontrado');

  deposito.status = revisao.status;
  deposito.revisado_em = new Date();
  deposito.revisado_por = revisao.revisado_por;
  return creditoRepository.save(deposito);
}

export async function summaryByDestinatario(id: string) {
  const transacoes = await transacaoRepository.findBy({ destinatario: id });
  return transacoes.reduce(
    (acc, curr) => {
      if (curr instanceof Credito) {
        if (curr.status === 'aprovado') acc.saldo += curr.valor;
        else if (curr.status === 'pendente') acc.pendente += curr.valor;
      } else {
        acc.saldo -= curr.valor;
      }
      return acc;
    },
    { saldo: 0, pendente: 0 },
  );
}
