import { User, UserRole } from '../src/models/user';
import { USER_ROLES } from '../src/shared/constants/index';
import bcrypt from 'bcrypt';

export async function seedSuperadmin() {
  const passwordHash = await bcrypt.hash('superadminpass', 10);
  await User.destroy({ where: { role: UserRole.Superadmin } });
  await User.create({
    username: 'superadmin',
    password: passwordHash,
    role: UserRole.Superadmin,
    // Model currently defines: username, password, role, shop_id, email, balance, created_by
    email: 'superadmin@example.com',
    balance: 0,
  });
  console.log('Seeded superadmin user');
}

if (require.main === module) {
  seedSuperadmin().catch(console.error);
}
