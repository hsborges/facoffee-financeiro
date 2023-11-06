import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, TableInheritance } from 'typeorm';

@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'tipo' } })
export abstract class Transacao {
  @PrimaryGeneratedColumn('uuid')
  public readonly id!: string;

  @Column()
  public referencia!: string;

  @Column()
  public valor!: number;

  @CreateDateColumn()
  public data_emissao!: Date;

  @Column()
  @Index()
  public emissor!: string;

  @Column()
  @Index()
  public destinatario!: string;

  @Column({ nullable: true })
  public descricao?: string;

  @Column()
  public readonly tipo!: string;

  constructor(referencia: string, valor: number, destinatario: string, emissor: string, descricao?: string) {
    this.referencia = referencia;
    this.valor = valor;
    this.destinatario = destinatario;
    this.emissor = emissor;
    this.data_emissao = new Date();
    this.descricao = descricao;
  }
}
