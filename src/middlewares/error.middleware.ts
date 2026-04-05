
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      message: err.message,
    });
  }

  console.error(err.stack);

  return res.status(500).json({
    message: 'Internal Server Error',
  });
};