import { Repository } from 'typeorm';

import { Credito } from '../entities/Credito';
import { Debito } from '../entities/Debito';
import { Transacao } from '../entities/Transacao';
import { AppDataSource } from '../utils/data-source';
import { NotFoundError } from '../utils/errors';
import { FileService, LocalFileService } from './FileService';

type TTransacao = ConstructorParameters<typeof Transacao>[0];
type TDeposito = Omit<ConstructorParameters<typeof Credito>[0], 'comprovante'> & {
  comprovante: { name: string; data: Buffer };
};

export class TransacaoService {
  private readonly repository: Repository<Transacao>;
  private readonly fileService: FileService;

  constructor(props?: Partial<{ repository: Repository<Transacao>; fileService: FileService }>) {
    this.repository = props?.repository || AppDataSource.getRepository(Transacao);
    this.fileService = props?.fileService || new LocalFileService();
  }

  async creditar({ comprovante, ...deposito }: TDeposito): Promise<Credito> {
    return this.repository.manager.transaction(async (manager) => {
      const result = await manager.save(new Credito({ ...deposito, comprovante: comprovante.name }));
      await this.fileService.save(`${result.id}-${comprovante.name}`, comprovante.data);
      return result;
    });
  }

  async debitar(debito: TTransacao): Promise<Debito> {
    return this.repository.save(new Debito(debito));
  }

  async revisar(id: string, revisao: { status: 'aprovado' | 'rejeitado'; revisado_por: string }): Promise<Credito> {
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
