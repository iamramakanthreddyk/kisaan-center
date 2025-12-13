/**
 * Domain Entity: User
 * Represents a user in the business domain
 * This is the pure business entity without database concerns
 */
export class UserEntity {
  constructor(
    public readonly id: number,
    public readonly username: string,
    public readonly firstname: string,
    public readonly lastname: string | null,
    public readonly email: string | null,
    public readonly phone: string | null,
    public readonly role: 'superadmin' | 'owner' | 'farmer' | 'buyer',
    public readonly shopId: number | null,
    public readonly isActive: boolean,
    public readonly lastLogin: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly createdBy: number | null,
    public readonly updatedBy: number | null,
    // Related entities
    public readonly shop?: ShopEntity
  ) {}

  /**
   * Business logic methods
   */
  get fullName(): string {
    return this.lastname ? `${this.firstname} ${this.lastname}` : this.firstname;
  }

  get displayName(): string {
    return this.fullName || this.username;
  }

  canAccessShop(shopId: number): boolean {
    if (this.role === 'superadmin') return true;
    if (this.role === 'owner') return this.shopId === shopId;
    return false;
  }

  hasPermission(permission: string): boolean {
    const rolePermissions = {
      superadmin: ['*'],
      owner: ['shop:read', 'shop:write', 'user:read', 'user:write', 'transaction:read', 'product:read', 'product:write'],
      farmer: ['transaction:read', 'product:read'],
      buyer: ['transaction:read', 'product:read']
    };

    const permissions = rolePermissions[this.role] || [];
    return permissions.includes('*') || permissions.includes(permission);
  }

  isOwnerOf(shopId: number): boolean {
    return this.role === 'owner' && this.shopId === shopId;
  }
}

/**
 * Domain Entity: Shop
 */
export class ShopEntity {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly address: string | null,
    public readonly phone: string | null,
    public readonly email: string | null,
    public readonly ownerId: number,
  public readonly planId: number | null,
  public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    // Related entities
  public readonly owner?: UserEntity
  ) {}

  get contactInfo(): string {
    const contact = [];
    if (this.phone) contact.push(this.phone);
    if (this.email) contact.push(this.email);
    return contact.join(' | ');
  }

  hasActivePlan(): boolean { return this.planId !== null; }
}

/**
 * Domain Entity: Product
 */
export class ProductEntity {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly description: string | null,
    public readonly categoryId: number | null,
    public readonly unit: string,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    // Related entities
    public readonly category?: CategoryEntity
  ) {}

  get displayName(): string {
    return this.category ? `${this.name} (${this.category.name})` : this.name;
  }

  get unitDisplay(): string {
    return this.unit || 'unit';
  }
}

/**
 * Domain Entity: Transaction
 */
export class TransactionEntity {
  constructor(
    public readonly id: number,
    public readonly shopId: number,
    public readonly farmerId: number | null,
    public readonly buyerId: number | null,
    public readonly productId: number,
    public readonly quantity: number,
    public readonly pricePerUnit: number,
    public readonly totalAmount: number,
    public readonly commissionRate: number,
    public readonly commissionAmount: number,
    public readonly transactionDate: Date,
    public readonly status: 'pending' | 'completed' | 'cancelled',
    public readonly notes: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    // Related entities
    public readonly shop?: ShopEntity,
    public readonly farmer?: UserEntity,
    public readonly buyer?: UserEntity,
    public readonly product?: ProductEntity
  ) {}

  get netAmount(): number {
    return this.totalAmount - this.commissionAmount;
  }

  get isCompleted(): boolean {
    return this.status === 'completed';
  }

  get farmerEarnings(): number {
    return this.isCompleted ? this.netAmount : 0;
  }

  get shopCommission(): number {
    return this.isCompleted ? this.commissionAmount : 0;
  }

  canBeModified(): boolean {
    return this.status === 'pending';
  }

  getParticipantRole(userId: number): 'farmer' | 'buyer' | 'shop' | 'none' {
    if (this.farmerId === userId) return 'farmer';
    if (this.buyerId === userId) return 'buyer';
    if (this.shop?.ownerId === userId) return 'shop';
    return 'none';
  }
}

/**
 * Domain Entity: Category
 */
export class CategoryEntity {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly description: string | null,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}

// (Removed legacy PlanEntity definition - consolidated into src/entities/PlanEntity.ts for simplified model)