import mongoose from 'mongoose';

/**
 * Returns true when Mongoose has an active MongoDB connection.
 */
export function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

/**
 * Blocks requests until MongoDB is connected; returns 503 otherwise.
 */
export function requireDatabase(req, res, next) {
  if (!isDatabaseReady()) {
    return res.status(503).json({
      error: 'Database is not connected. Check MongoDB Atlas network access and restart the backend.',
    });
  }
  next();
}
