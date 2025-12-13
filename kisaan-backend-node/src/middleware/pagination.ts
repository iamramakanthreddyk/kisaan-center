import { Request, Response, NextFunction } from 'express';

export interface PaginationInfo {
  page: number;
  pageSize: number;
  limit: number;
  offset: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      pagination?: PaginationInfo;
    }
  }
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export function paginationParser(req: Request, _res: Response, next: NextFunction) {
  const rawPage = req.query.page as string | undefined;
  const rawSize = req.query.pageSize as string | undefined;
  let page = Number(rawPage || DEFAULT_PAGE);
  let pageSize = Number(rawSize || DEFAULT_PAGE_SIZE);

  if (isNaN(page) || page < 1) page = DEFAULT_PAGE;
  if (isNaN(pageSize) || pageSize < 1) pageSize = DEFAULT_PAGE_SIZE;
  if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

  req.pagination = {
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize
  };
  next();
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function buildPaginationMeta(total: number, info: PaginationInfo): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / info.pageSize));
  return {
    page: info.page,
    pageSize: info.pageSize,
    total,
    totalPages,
    hasNext: info.page < totalPages,
    hasPrev: info.page > 1
  };
}

