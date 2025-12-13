/**
 * Database Index Optimization Migration
 * Adds composite indexes identified in the backend optimization analysis
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Users table optimizations
      await queryInterface.addIndex('kisaan_users', ['shop_id', 'role'], {
        name: 'idx_users_shop_role',
        concurrently: true
      });

      await queryInterface.addIndex('kisaan_users', ['shop_id', 'created_at'], {
        name: 'idx_users_shop_created',
        concurrently: true
      });

      await queryInterface.addIndex('kisaan_users', ['username', 'shop_id'], {
        name: 'idx_users_username_shop',
        concurrently: true
      });

      // Transactions table optimizations
      await queryInterface.addIndex('kisaan_transactions', ['shop_id', 'created_at'], {
        name: 'idx_transactions_shop_created',
        concurrently: true
      });

      await queryInterface.addIndex('kisaan_transactions', ['farmer_id', 'status'], {
        name: 'idx_transactions_farmer_status',
        concurrently: true
      });

      await queryInterface.addIndex('kisaan_transactions', ['buyer_id', 'status'], {
        name: 'idx_transactions_buyer_status',
        concurrently: true
      });

      await queryInterface.addIndex('kisaan_transactions', ['shop_id', 'status', 'created_at'], {
        name: 'idx_transactions_shop_status_created',
        concurrently: true
      });

      // Payments table optimizations
      await queryInterface.addIndex('kisaan_payments', ['transaction_id', 'status'], {
        name: 'idx_payments_transaction_status',
        concurrently: true
      });

      await queryInterface.addIndex('kisaan_payments', ['user_id', 'created_at'], {
        name: 'idx_payments_user_created',
        concurrently: true
      });

      // Shops table optimization
      await queryInterface.addIndex('kisaan_shops', ['owner_id', 'created_at'], {
        name: 'idx_shops_owner_created',
        concurrently: true
      });

      // Performance indexes for specific query patterns
      await queryInterface.addIndex('kisaan_transactions', ['farmer_id', 'buyer_id'], {
        name: 'idx_transactions_farmer_buyer',
        concurrently: true
      });

      await queryInterface.addIndex('kisaan_users', ['balance'], {
        name: 'idx_users_balance',
        concurrently: true,
        where: {
          balance: {
            [Sequelize.Op.ne]: 0
          }
        }
      });

      console.log('✅ All performance indexes created successfully');

    } catch (error) {
      console.error('❌ Error creating indexes:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove all indexes in reverse order
      const indexes = [
        'idx_users_balance',
        'idx_transactions_farmer_buyer',
        'idx_shops_owner_created',
        'idx_payments_user_created',
        'idx_payments_transaction_status',
        'idx_transactions_shop_status_created',
        'idx_transactions_buyer_status',
        'idx_transactions_farmer_status',
        'idx_transactions_shop_created',
        'idx_users_username_shop',
        'idx_users_shop_created',
        'idx_users_shop_role'
      ];

      for (const indexName of indexes) {
        try {
          await queryInterface.removeIndex('kisaan_users', indexName);
        } catch (e) {
          try {
            await queryInterface.removeIndex('kisaan_transactions', indexName);
          } catch (e) {
            try {
              await queryInterface.removeIndex('kisaan_payments', indexName);
            } catch (e) {
              try {
                await queryInterface.removeIndex('kisaan_shops', indexName);
              } catch (e) {
                console.warn(`Index ${indexName} not found or already removed`);
              }
            }
          }
        }
      }

      console.log('✅ All indexes removed successfully');

    } catch (error) {
      console.error('❌ Error removing indexes:', error);
      throw error;
    }
  }
};