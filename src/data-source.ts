import { globSync } from 'glob';
import path, { join } from 'path';
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: join(__dirname, '..', 'data', 'db', `${process.env.NODE_ENV || 'development'}.sqlite`),
  synchronize: true,
  entitySkipConstructor: true,
  entities: globSync('*.{js,ts}', {
    cwd: path.join(__dirname, 'entities'),
    ignore: '*.{spec,ts}.{js,ts}',
    absolute: true,
  }),
});
