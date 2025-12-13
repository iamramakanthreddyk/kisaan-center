import { sequelize } from '../src/models/index';

export async function seedShopProducts() {
  // Direct SQL insert to map all products to shop 1 as active
  await sequelize.query(`
    INSERT INTO shop_products (shop_id, product_id, is_active)
    SELECT 1, id, TRUE FROM products;
  `);
  console.log('Seeded shop_products (all products assigned to shop 1)');
}
