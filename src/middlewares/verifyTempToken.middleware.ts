import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export const verifyTempToken = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new ApiError(401, 'No token provided...');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;

    if (decoded.purpose !== '2fa') {
      throw new ApiError(401, 'Invalid token purpose...');
    }

    req.user = { userId: decoded.userId, email: '', role: '' };
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired — please login again...');
    }
    throw new ApiError(401, 'Invalid token...');
  }
};