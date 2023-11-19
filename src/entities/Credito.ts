import { ChildEntity, Column } from 'typeorm';

import { Transacao } from './Transacao';

@ChildEntity()
export class Credito extends Transacao {
  @Column()
  public readonly comprovante!: string;

  @Column({ default: 'pendente', name: 'status' })
  private _status: 'pendente' | 'aprovado' | 'rejeitado' = 'pendente';

  public get status(): 'pendente' | 'aprovado' | 'rejeitado' {
    return this._status;
  }

  @Column({ nullable: true })
  private _revisado_em?: Date;

  public get revisado_em(): Date | undefined {
    return this._revisado_em;
  }

  @Column({ nullable: true })
  private _revisado_por?: string;

  public get revisado_por() {
    return this._revisado_por;
  }

  constructor(props: ConstructorParameters<typeof Transacao>[0] & { comprovante: string }) {
    super(props);
    this.comprovante = props.comprovante;
  }

  public revisar(status: 'pendente' | 'aprovado' | 'rejeitado', revisado_por: string): Credito {
    this._status = status;
    this._revisado_por = revisado_por;
    this._revisado_em = new Date();
    return this;
  }
}
