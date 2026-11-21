import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { memoryStoreEnabled, memUsers } from '../Utils/memoryStore.js';

function useMemory() {
  return memoryStoreEnabled() || mongoose.connection.readyState !== 1;
}

async function findUserById(userId) {
  if (useMemory()) {
    return memUsers.findById(userId);
  }
  return User.findById(userId).select('-passwordHash');
}

/**
 * Optional auth: attaches req.user when a valid JWT is present.
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
    const user = await findUserById(decoded.userId);

    if (user) {
      req.user = user;
    }
  } catch {
    // Invalid token — continue without authenticated user
  }

  next();
}

/**
 * Required auth: rejects the request when no valid JWT is present.
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
    const user = await findUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User account not found.' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}
