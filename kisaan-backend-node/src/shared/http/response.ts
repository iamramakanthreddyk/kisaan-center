export interface SuccessMeta { total?: number; page?: number; pageSize?: number }
export interface SuccessResponse<T> { success: true; data: T; meta?: SuccessMeta }
export interface ErrorResponse { success: false; error: string; message: string; reqId?: string }

export function ok<T>(data: T, meta?: SuccessMeta): SuccessResponse<T> { return { success: true, data, meta }; }
export function created<T>(data: T, meta?: SuccessMeta): SuccessResponse<T> { return { success: true, data, meta }; }
