/**
 * Core Seed Script
 * Populates essential baseline data:
 * - Superadmin user (idempotent)
 * - Minimum 3 plans (Basic, Standard, Premium) (idempotent)
 * - Core categories (Fruits, Vegetables, Flowers, Grains)
 * - 15+ products per category (no price field)
 */
import sequelize from '../src/config/database';
import { Plan } from '../src/models/plan';
import { User } from '../src/models/user';
import { Category } from '../src/models/category';
import { Product } from '../src/models/product';
import { PasswordManager } from '../src/shared/utils/auth';

async function ensureConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connection OK');
  } catch (err) {
    console.error('❌ DB connection failed', err);
    process.exit(1);
  }
}

async function seedSuperAdmin() {
  const username = 'superadmin';
  const existing = await User.findOne({ where: { username } });
  if (existing) {
    console.log('Superadmin already exists');
    return existing;
  }
  const passwordManager = new PasswordManager();
  const hashed = await passwordManager.hashPassword('ChangeMe123!');
  const user = await User.create({
    username,
    password: hashed,
    role: 'superadmin',
    balance: 0
  } as any);
  console.log('Created superadmin (default password: ChangeMe123!)');
  return user;
}

async function seedPlans() {
  const plans = [
    { name: 'Basic', description: 'Entry plan', features: '[]' },
    { name: 'Standard', description: 'Standard growth plan', features: '[]' },
    { name: 'Premium', description: 'Full scale plan', features: '[]' }
  ];
  for (const p of plans) {
    const [plan, created] = await Plan.findOrCreate({ where: { name: p.name }, defaults: p });
    console.log(created ? `Created plan ${plan.name}` : `Plan exists ${plan.name}`);
  }
}

const categoryProducts: Record<string,string[]> = {
  Fruits: [
    'Apple','Banana','Mango','Orange','Grapes','Pineapple','Papaya','Guava','Pomegranate','Watermelon','Strawberry','Kiwi','Pear','Peach','Lemon'
  ],
  Vegetables: [
    'Tomato','Potato','Onion','Carrot','Cabbage','Cauliflower','Spinach','Brinjal','Okra','Peas','Cucumber','Radish','Beetroot','Pumpkin','Garlic'
  ],
  Flowers: [
    'Rose','Marigold','Jasmine','Lotus','Lily','Tulip','Sunflower','Orchid','Daisy','Carnation','Gerbera','Hibiscus','Chrysanthemum','Lavender','Magnolia'
  ],
  Grains: [
    'Wheat','Rice','Maize','Barley','Oats','Millet','Sorghum','Quinoa','Buckwheat','Rye','Lentil','Chickpea','Pea','Soybean','Mustard Seed'
  ]
};

async function seedCategoriesAndProducts() {
  for (const [categoryName, products] of Object.entries(categoryProducts)) {
    const [category] = await Category.findOrCreate({
      where: { name: categoryName },
      defaults: { name: categoryName, description: `${categoryName} category` }
    });
    for (const prodName of products) {
      const [prod, created] = await Product.findOrCreate({
        where: { name: prodName, category_id: category.id },
        defaults: { name: prodName, category_id: category.id, description: prodName, unit: 'kg', record_status: 'active' }
      });
      if (created) console.log(`  Added product ${prodName} -> ${categoryName}`);
    }
  }
}

async function run() {
  await ensureConnection();
  await seedSuperAdmin();
  await seedPlans();
  await seedCategoriesAndProducts();
  console.log('✅ Core seed complete');
  process.exit(0);
}

run().catch(err => {
  console.error('Core seed failed', err);
  process.exit(1);
});
