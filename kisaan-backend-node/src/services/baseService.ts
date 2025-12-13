// Generic BaseService to encapsulate repeated CRUD flows using a repository interface
export interface CrudRepository<TEntity> {
  findById(id: number): Promise<TEntity | null>;
  findAll(options?: unknown): Promise<TEntity[]>;
  create(entity: TEntity): Promise<TEntity>;
  update(id: number, entity: TEntity): Promise<TEntity | null>;
  delete(id: number): Promise<boolean>;
}

export abstract class BaseService<TEntity, TDTO> {
  protected abstract repository: CrudRepository<TEntity>;
  protected abstract toDTO(entity: TEntity): TDTO;

  async getById(id: number): Promise<TDTO | null> {
    const entity = await this.repository.findById(id);
    return entity ? this.toDTO(entity) : null;
  }

  async list(): Promise<TDTO[]> {
    const entities = await this.repository.findAll();
    return entities.map(e => this.toDTO(e));
  }
}
