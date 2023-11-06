import { ChildEntity, Column } from 'typeorm';

import { Transacao } from './Transacao';

@ChildEntity()
export class Credito extends Transacao {
  @Column()
  public comprovante!: string;

  @Column({ default: 'pendente' })
  public status!: 'pendente' | 'aprovado' | 'rejeitado';

  @Column({ nullable: true })
  public revisado_em?: Date;

  @Column({ nullable: true })
  public revisado_por?: string;
}
