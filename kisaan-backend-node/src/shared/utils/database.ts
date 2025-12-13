/**
 * Database Utilities
 * Common database operations, query builders, and transaction helpers
 */

import { Transaction, Op } from 'sequelize';

/**
 * Query Builder Interface
 */
export interface QueryOptions {
  where?: Record<string, unknown>;
  include?: unknown[];
  order?: Array<[string, 'ASC' | 'DESC']>;
  limit?: number;
  offset?: number;
  attributes?: string[];
  raw?: boolean;
  transaction?: Transaction;
}

/**
 * Pagination Result Interface
 */
export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Sort Options
 */
export interface SortOptions {
  field: string;
  direction: 'ASC' | 'DESC';
}

/**
 * Filter Options
 */
export interface FilterOptions {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between';
  value: unknown;
}

/**
 * Query Builder Helper
 */
export class QueryBuilder {
  /**
   * Build where clause from filters
   */
  static buildWhereClause(filters: FilterOptions[]): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    for (const filter of filters) {
      const { field, operator, value } = filter;

      switch (operator) {
        case 'eq':
          where[field] = value;
          break;
        case 'ne':
          where[field] = { [Op.ne]: value };
          break;
        case 'gt':
          where[field] = { [Op.gt]: value };
          break;
        case 'gte':
          where[field] = { [Op.gte]: value };
          break;
        case 'lt':
          where[field] = { [Op.lt]: value };
          break;
        case 'lte':
          where[field] = { [Op.lte]: value };
          break;
        case 'like':
          where[field] = { [Op.like]: `%${value}%` };
          break;
        case 'in':
          where[field] = { [Op.in]: Array.isArray(value) ? value : [value] };
          break;
        case 'between':
          if (Array.isArray(value) && value.length === 2) {
            where[field] = { [Op.between]: value };
          }
          break;
      }
    }

    return where;
  }

  /**
   * Build order clause from sort options
   */
  static buildOrderClause(sorts: SortOptions[]): Array<[string, 'ASC' | 'DESC']> {
    return sorts.map(sort => [sort.field, sort.direction]);
  }

  /**
   * Build date range filter
   */
  static buildDateRangeFilter(
    field: string,
    startDate?: Date,
    endDate?: Date
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (startDate && endDate) {
      filter[field] = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      filter[field] = { [Op.gte]: startDate };
    } else if (endDate) {
      filter[field] = { [Op.lte]: endDate };
    }

    return filter;
  }

  /**
   * Build search filter for multiple fields
   */
  static buildSearchFilter(fields: string[], searchTerm: string): Record<string, unknown> {
    if (!searchTerm || fields.length === 0) {
      return {};
    }

    const searchConditions = fields.map(field => ({
      [field]: { [Op.like]: `%${searchTerm}%` }
    }));

    return { [Op.or]: searchConditions };
  }

  /**
   * Build pagination options
   */
  static buildPaginationOptions(page: number = 1, limit: number = 10): {
    limit: number;
    offset: number;
  } {
    const sanitizedPage = Math.max(1, page);
    const sanitizedLimit = Math.min(Math.max(1, limit), 100);
    
    return {
      limit: sanitizedLimit,
      offset: (sanitizedPage - 1) * sanitizedLimit
    };
  }
}

/**
 * Pagination Helper
 */
export class PaginationHelper {
  /**
   * Calculate pagination metadata
   */
  static calculatePagination(
    total: number,
    page: number,
    limit: number
  ): PaginationResult<unknown>['pagination'] {
    const pages = Math.ceil(total / limit);
    
    return {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1
    };
  }

  /**
   * Create paginated result
   */
  static createPaginatedResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): PaginationResult<T> {
    return {
      data,
      pagination: this.calculatePagination(total, page, limit)
    };
  }
}

/**
 * Transaction Helper
 */
export class TransactionHelper {
  /**
   * Execute operations in transaction
   */
  static async withTransaction<T>(
    sequelize: { transaction: () => Promise<Transaction> },
    operations: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    const transaction = await sequelize.transaction();
    
    try {
      const result = await operations(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Execute multiple operations in transaction
   */
  static async withTransactionBatch<T>(
    sequelize: { transaction: () => Promise<Transaction> },
    operationBatch: Array<(transaction: Transaction) => Promise<T>>
  ): Promise<T[]> {
    const transaction = await sequelize.transaction();
    
    try {
      const results: T[] = [];
      
      for (const operation of operationBatch) {
        const result = await operation(transaction);
        results.push(result);
      }
      
      await transaction.commit();
      return results;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

/**
 * SQL Helper
 */
export class SQLHelper {
  /**
   * Escape SQL identifiers (table names, column names)
   */
  static escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  /**
   * Build bulk insert query
   */
  static buildBulkInsertQuery(
    tableName: string,
    columns: string[],
    rowCount: number
  ): string {
    const escapedTableName = this.escapeIdentifier(tableName);
    const escapedColumns = columns.map(col => this.escapeIdentifier(col)).join(', ');
    
    const valuePlaceholders = columns.map(() => '?').join(', ');
    const rowPlaceholders = Array(rowCount).fill(`(${valuePlaceholders})`).join(', ');
    
    return `INSERT INTO ${escapedTableName} (${escapedColumns}) VALUES ${rowPlaceholders}`;
  }

  /**
   * Build bulk update query
   */
  static buildBulkUpdateQuery(
    tableName: string,
    setColumns: string[],
    whereColumn: string
  ): string {
    const escapedTableName = this.escapeIdentifier(tableName);
    const setClause = setColumns
      .map(col => `${this.escapeIdentifier(col)} = ?`)
      .join(', ');
    const whereClause = `${this.escapeIdentifier(whereColumn)} = ?`;
    
    return `UPDATE ${escapedTableName} SET ${setClause} WHERE ${whereClause}`;
  }

  /**
   * Build upsert query (PostgreSQL style)
   */
  static buildUpsertQuery(
    tableName: string,
    insertColumns: string[],
    conflictColumn: string,
    updateColumns: string[]
  ): string {
    const escapedTableName = this.escapeIdentifier(tableName);
    const escapedInsertColumns = insertColumns.map(col => this.escapeIdentifier(col)).join(', ');
    const insertPlaceholders = insertColumns.map(() => '?').join(', ');
    const updateClause = updateColumns
      .map(col => `${this.escapeIdentifier(col)} = EXCLUDED.${this.escapeIdentifier(col)}`)
      .join(', ');
    
    return `
      INSERT INTO ${escapedTableName} (${escapedInsertColumns}) 
      VALUES (${insertPlaceholders})
      ON CONFLICT (${this.escapeIdentifier(conflictColumn)}) 
      DO UPDATE SET ${updateClause}
    `;
  }
}

/**
 * Data Type Converters
 */
export class DataConverters {
  /**
   * Convert string to boolean
   */
  static stringToBoolean(value: string): boolean {
    const truthyValues = ['true', '1', 'yes', 'on', 'y'];
    return truthyValues.includes(value.toLowerCase());
  }

  /**
   * Convert string to number safely
   */
  static stringToNumber(value: string): number | null {
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  /**
   * Convert string to date safely
   */
  static stringToDate(value: string): Date | null {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Convert database row to domain object
   */
  static mapDbRowToObject<T>(
    row: Record<string, unknown>,
    mapping: Record<string, string | ((value: unknown) => unknown)>
  ): T {
    const result: Record<string, unknown> = {};
    
    for (const [targetKey, sourceKey] of Object.entries(mapping)) {
      if (typeof sourceKey === 'string') {
        result[targetKey] = row[sourceKey];
      } else {
        result[targetKey] = sourceKey(row);
      }
    }
    
    return result as T;
  }

  /**
   * Convert domain object to database row
   */
  static mapObjectToDbRow(
    obj: Record<string, unknown>,
    mapping: Record<string, string | ((value: unknown) => unknown)>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    for (const [sourceKey, targetKey] of Object.entries(mapping)) {
      if (typeof targetKey === 'string') {
        result[targetKey] = obj[sourceKey];
      } else {
        // targetKey is a function, apply it to the value
        const transformedValue = targetKey(obj[sourceKey]);
        result[sourceKey + '_transformed'] = transformedValue;
      }
    }
    
    return result;
  }
}

/**
 * Bulk Operations Helper
 */
export class BulkOperationsHelper {
  /**
   * Process data in chunks
   */
  static async processInChunks<T, R>(
    data: T[],
    chunkSize: number,
    processor: (chunk: T[]) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const result = await processor(chunk);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Bulk insert with conflict resolution
   */
  static async bulkInsertWithConflictResolution<T>(
    model: { bulkCreate: (data: T[], opts: { updateOnDuplicate: string[]; transaction?: Transaction; returning: boolean }) => Promise<T[]> },
    data: T[],
    options: {
      conflictColumns: string[];
      updateColumns: string[];
      transaction?: Transaction;
    }
  ): Promise<T[]> {
    const { updateColumns, transaction } = options;
    return await model.bulkCreate(data, {
      updateOnDuplicate: updateColumns,
      transaction,
      returning: true
    });
  }
}

/**
 * Query Performance Helper
 */
export class QueryPerformanceHelper {
  /**
   * Log slow queries
   */
  static logSlowQuery(query: string, duration: number, threshold: number = 1000): void {
    if (duration > threshold) {
      console.warn(`Slow query detected (${duration}ms):`, query);
    }
  }

  /**
   * Measure query execution time
   */
  static async measureQueryTime<T>(
    queryFn: () => Promise<T>,
    queryName?: string
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await queryFn();
    const duration = Date.now() - startTime;
    
    if (queryName) {
      console.log(`Query "${queryName}" executed in ${duration}ms`);
    }
    
    return { result, duration };
  }

  /**
   * Create query cache key
   */
  static createCacheKey(
    operation: string,
  params: Record<string, unknown>
  ): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
  }, {} as Record<string, unknown>);
    
    return `${operation}:${JSON.stringify(sortedParams)}`;
  }
}

/**
 * Export all helpers
 */
export const DatabaseHelpers = {
  QueryBuilder,
  PaginationHelper,
  TransactionHelper,
  SQLHelper,
  DataConverters,
  BulkOperationsHelper,
  QueryPerformanceHelper
};