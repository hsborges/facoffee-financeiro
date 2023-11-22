import { globSync } from 'glob';
import path, { join } from 'path';
import { DataSource } from 'typeorm';

const database =
  process.env.NODE_ENV === 'test'
    ? ':memory:'
    : join(__dirname, '..', 'data', 'db', `${process.env.NODE_ENV || 'development'}.sqlite`);

const entities = globSync('*.{js,ts}', {
  cwd: path.join(__dirname, '..', 'entities'),
  ignore: '*.{spec,ts}.{js,ts}',
  absolute: true,
});

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database,
  synchronize: true,
  entitySkipConstructor: true,
  entities,
});
