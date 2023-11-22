import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, TableInheritance } from 'typeorm';

@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'tipo' } })
export abstract class Transacao {
  @PrimaryGeneratedColumn('uuid')
  public readonly id!: string;

  @Column()
  public readonly referencia!: string;

  @Column('decimal')
  public readonly valor!: number;

  @CreateDateColumn()
  public readonly data_emissao!: Date;

  @Column()
  @Index()
  public readonly emissor!: string;

  @Column()
  @Index()
  public readonly destinatario!: string;

  @Column({ nullable: true })
  public readonly descricao?: string;

  @Column()
  public readonly tipo: string = this.constructor.name;

  constructor(props: { referencia: string, valor: number, destinatario: string, emissor: string, descricao?: string }) {
    if (props.valor <= 0) throw new Error('Valor inválido');

    this.referencia = props.referencia;
    this.valor = props.valor;
    this.destinatario = props.destinatario;
    this.emissor = props.emissor;
    this.data_emissao = new Date();
    this.descricao = props.descricao;
  }
}
