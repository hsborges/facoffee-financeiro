import { ChildEntity } from 'typeorm';

import { Transacao } from './Transacao';

@ChildEntity()
export class Debito extends Transacao {}
