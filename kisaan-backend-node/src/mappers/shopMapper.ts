// Functions to map between ShopEntity, ShopDTO, and ORM model
import { ShopEntity } from '../entities/ShopEntity';
import { ShopDTO, CreateShopDTO } from '../dtos';
import { Shop } from '../models/shop';

export function toShopDTO(entity: ShopEntity): ShopDTO {
  return {
    id: entity.id!,
    name: entity.name!,
    owner_id: Number(entity.owner_id!),
    location: entity.location || null,
    address: entity.address,
    contact: entity.contact,
    email: entity.email || null,
    commission_rate: entity.commission_rate ?? 0,
    status: entity.status!,
    created_at: entity.created_at,
    updated_at: entity.updated_at,
  };
}

export function fromCreateShopDTO(dto: CreateShopDTO): ShopEntity {
  return new ShopEntity({
    name: dto.name,
    owner_id: dto.owner_id,
    location: dto.location ?? undefined,
    address: dto.address,
    contact: dto.contact,
  email: (dto as { email?: string }).email, // backward compatibility if email added in DTO later
  commission_rate: (dto as { commission_rate?: number }).commission_rate ?? 0,
    status: 'active',
  });
}

export function fromShopModel(model: Shop): ShopEntity {
  const plain = model.get({ plain: true }) as {
    id?: number;
    name?: string;
    owner_id?: number;
    plan_id?: number | null;
    location?: string | null;
    address?: string | null;
    contact?: string | null;
    email?: string | null;
    commission_rate?: number | null;
    settings?: Record<string, unknown> | null;
    status?: 'active' | 'inactive';
    created_at?: Date;
    createdAt?: Date;
    updated_at?: Date;
    updatedAt?: Date;
  };
  return new ShopEntity({
    id: plain.id,
    name: plain.name,
    owner_id: plain.owner_id,
    plan_id: plain.plan_id,
  location: plain.location ?? undefined,
  address: plain.address ?? undefined,
  contact: plain.contact ?? undefined,
  email: plain.email ?? undefined,
    commission_rate: plain.commission_rate != null ? Number(plain.commission_rate) : 0,
    settings: plain.settings ?? null,
    status: plain.status,
    created_at: plain.created_at || plain.createdAt,
    updated_at: plain.updated_at || plain.updatedAt,
  });
}
