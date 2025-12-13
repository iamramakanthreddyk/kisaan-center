// src/mappers/userMapper.ts
// Functions to map between UserEntity, UserDTO, and ORM model

import { UserEntity } from '../entities/UserEntity';
import { UserDTO, CreateUserDTO } from '../dtos';
import { User } from '../models/user';
import { UserAnalyticsService } from '../services/userAnalyticsService';

function normalizeBalance(value: string | number | undefined | null): number {
  if (typeof value === 'string') {
    const parsed = parseFloat(value as string);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value as number;
  return 0;
}

export async function toUserDTO(entity: UserEntity): Promise<UserDTO> {
  // Calculate computed fields using analytics service
  const analytics = await UserAnalyticsService.getUserAnalytics(
    entity.id!,
    entity.role!,
    entity.shop_id
  );

  return {
    id: entity.id!,
    username: entity.username!,
    email: entity.email || '',
    role: entity.role!,
    shop_id: entity.shop_id,
    firstname: entity.firstname ?? '',
    contact: entity.contact ?? '',
    balance: normalizeBalance((entity as { balance?: string | number }).balance),
    created_at: entity.created_at,
    updated_at: entity.updated_at,
    custom_commission_rate: (entity as { custom_commission_rate?: number | null }).custom_commission_rate ?? null,
    // Computed fields from analytics service
    status: analytics.status,
    cumulative_value: analytics.cumulative_value,
  };
}

// Synchronous version for cases where analytics aren't needed
export function toUserDTOSync(entity: UserEntity): Omit<UserDTO, 'status' | 'cumulative_value'> {
  return {
    id: entity.id!,
    username: entity.username!,
    email: entity.email || '',
    role: entity.role!,
    shop_id: entity.shop_id,
    firstname: entity.firstname ?? '',
  balance: normalizeBalance((entity as { balance?: string | number }).balance),
    created_at: entity.created_at,
    updated_at: entity.updated_at,
  custom_commission_rate: (entity as { custom_commission_rate?: number | null }).custom_commission_rate ?? null,
  };
}

export function fromCreateUserDTO(dto: CreateUserDTO): UserEntity {
  return new UserEntity({
    username: dto.username,
    password: dto.password,
    role: dto.role,
    shop_id: dto.shop_id,
    email: dto.email,
    firstname: dto.firstname ?? '',
  });
}

export function fromUserModel(model: User): UserEntity {
  const plain = model.get({ plain: true });
  if (plain.balance !== undefined && typeof plain.balance === 'string') {
    plain.balance = parseFloat(plain.balance);
  }
  return new UserEntity(plain);
}
