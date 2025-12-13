// src/repositories/BaseRepository.ts
// Generic base repository for CRUD operations
import { Model, ModelStatic, FindOptions, Transaction } from 'sequelize';

// TModel must have an id: number attribute for generic repository to work
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export abstract class BaseRepository<TModel extends Model<{ id: number }, any>, TEntity> {
  protected abstract model: ModelStatic<TModel>;
  protected abstract entityName: string;

  protected abstract toDomainEntity(model: TModel): TEntity;
  protected abstract toModelData(entity: TEntity): Record<string, unknown>;

  async findById(id: number): Promise<TEntity | null> {
    const result = await this.model.findByPk(id);
    return result ? this.toDomainEntity(result) : null;
  }

  async findAll(options?: FindOptions): Promise<TEntity[]> {
    const results = await this.model.findAll(options);
    return results.map((model: TModel) => this.toDomainEntity(model));
  }

  async create(entity: TEntity, options?: { tx?: unknown }): Promise<TEntity> {
  const data = this.toModelData(entity) as TModel["_creationAttributes"];
  const createOpts: { transaction?: Transaction } = {};
  if (options?.tx) createOpts.transaction = options.tx as Transaction;
  const result = await this.model.create(data, createOpts);
  return this.toDomainEntity(result);
  }

  async update(id: number, entity: TEntity, options?: { tx?: unknown }): Promise<TEntity | null> {
    const data = this.toModelData(entity) as TModel["_creationAttributes"];
    const updateOpts = {
      where: { id } as unknown as import('sequelize').WhereOptions<import('sequelize').Attributes<TModel>>, // Type assertion to satisfy Sequelize generics
      returning: true as const,
      transaction: options?.tx as Transaction | undefined,
    };
    const [count, rows] = await this.model.update(data, updateOpts);
    if (count > 0 && Array.isArray(rows) && rows[0]) {
      return this.toDomainEntity(rows[0]);
    }
    return null;
  }

  async delete(id: number): Promise<boolean> {
  const count = await this.model.destroy({
    where: { id } as unknown as import('sequelize').WhereOptions<import('sequelize').Attributes<TModel>>,
  }); // Type assertion to satisfy Sequelize generics
  return count > 0;
  }
}
