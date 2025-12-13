import { QueryInterface } from 'sequelize';

/**
 * Migration: Add is_active column to kisaan_plans if missing.
 */
module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const table: Record<string, unknown> = await queryInterface.describeTable('kisaan_plans');
    if (!table['is_active']) {
      await queryInterface.sequelize.query('ALTER TABLE "kisaan_plans" ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE');
    }
  },
  down: async (queryInterface: QueryInterface): Promise<void> => {
    const table: Record<string, unknown> = await queryInterface.describeTable('kisaan_plans');
    if (table['is_active']) {
      await queryInterface.removeColumn('kisaan_plans', 'is_active');
    }
  }
};