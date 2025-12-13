import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ErrorCodes } from '../shared/errors/errorCodes';

export const validateSchema = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        // @ts-expect-error: ZodError.errors is always present
        const errorList = err.errors;
        if (!Array.isArray(errorList) || errorList.length === 0) {
          (req as unknown as { log?: { warn: (msg: unknown, context?: string) => void } }).log?.warn({ err }, 'zod validation error (raw)');
        }
        return res.status(400).json({
          success: false,
          error: ErrorCodes.VALIDATION_ERROR,
          message: 'Validation error',
          details: Array.isArray(errorList)
            ? errorList.map((error) => ({
                field: error.path.join('.') || 'root',
                code: error.code || 'invalid',
                message: error.message
              }))
            : []
        });
      }
      next(err);
    }
  };
};