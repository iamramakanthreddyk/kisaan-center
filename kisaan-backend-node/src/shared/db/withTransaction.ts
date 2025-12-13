import { Sequelize, Transaction } from 'sequelize';

export async function withTransaction<T>(sequelize: Sequelize, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  const tx = await sequelize.transaction();
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}
