import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { memoryStoreEnabled, memUsers } from '../Utils/memoryStore.js';

const router = express.Router();

function useMemory() {
  return memoryStoreEnabled() || mongoose.connection.readyState !== 1;
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'dev_secret_change_me', {
    expiresIn: '7d',
  });
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(password, 12);

    if (useMemory()) {
      const existing = await memUsers.findByEmail(normalizedEmail);
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      const user = await memUsers.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
      });
      const token = signToken(user._id);
      return res.status(201).json({
        success: true,
        token,
        user: { id: user._id, name: user.name, email: user.email },
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('❌ Registration Failure:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    res.status(500).json({ error: 'Unable to create account. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (useMemory()) {
      const user = await memUsers.findByEmail(normalizedEmail);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      const token = signToken(user._id);
      return res.status(200).json({
        success: true,
        token,
        user: { id: user._id, name: user.name, email: user.email },
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('❌ Login Failure:', error);
    res.status(500).json({ error: 'Unable to log in.' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: { id: req.user._id, name: req.user.name, email: req.user.email },
  });
});

export default router;
