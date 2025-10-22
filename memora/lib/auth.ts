/**
 * Authentication Service
 * 
 * Handles user authentication with email-based passcode system
 */

import { Client } from '@elastic/elasticsearch';
import crypto from 'crypto';

const client = new Client({
  node: process.env.ES_HOST || 'http://localhost:9200',
  auth: { 
    username: process.env.ES_USERNAME || 'elastic', 
    password: process.env.ES_PASSWORD || 'changeme' 
  },
});

const USERS_INDEX = 'memora-users';
const PASSCODES_INDEX = 'memora-passcodes';

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  user_id: string;
  email: string;
  name?: string;
  password_hash?: string;
  created_at: string;
  last_login?: string;
  is_verified: boolean;
}

export interface Passcode {
  email: string;
  code: string;
  type: 'login' | 'signup' | 'reset';
  expires_at: string;
  created_at: string;
  used: boolean;
}

// ============================================================================
// INDEX MANAGEMENT
// ============================================================================

export async function createAuthIndices() {
  // Create users index
  const usersExists = await client.indices.exists({ index: USERS_INDEX });
  if (!usersExists) {
    await client.indices.create({
      index: USERS_INDEX,
      body: {
        mappings: {
          properties: {
            user_id: { type: 'keyword' },
            email: { type: 'keyword' },
            name: { type: 'text' },
            password_hash: { type: 'keyword' },
            created_at: { type: 'date' },
            last_login: { type: 'date' },
            is_verified: { type: 'boolean' },
          },
        },
      },
    });
    console.log('[Auth] Created users index');
  }

  // Create passcodes index
  const passcodesExists = await client.indices.exists({ index: PASSCODES_INDEX });
  if (!passcodesExists) {
    await client.indices.create({
      index: PASSCODES_INDEX,
      body: {
        mappings: {
          properties: {
            email: { type: 'keyword' },
            code: { type: 'keyword' },
            type: { type: 'keyword' },
            expires_at: { type: 'date' },
            created_at: { type: 'date' },
            used: { type: 'boolean' },
          },
        },
      },
    });
    console.log('[Auth] Created passcodes index');
  }
}

// ============================================================================
// PASSWORD UTILITIES
// ============================================================================

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// ============================================================================
// PASSCODE GENERATION
// ============================================================================

function generatePasscode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendPasscode(
  email: string,
  type: 'login' | 'signup' | 'reset'
): Promise<{ success: boolean; error?: string }> {
  try {
    await createAuthIndices();

    // Generate 6-digit code
    const code = generatePasscode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    // Store passcode
    await client.index({
      index: PASSCODES_INDEX,
      body: {
        email: email.toLowerCase(),
        code,
        type,
        expires_at: expiresAt.toISOString(),
        created_at: now.toISOString(),
        used: false,
      },
      refresh: true,
    });

    // Send email (in production, use SendGrid, AWS SES, etc.)
    await sendPasscodeEmail(email, code, type);

    console.log(`[Auth] Sent ${type} passcode to ${email}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Auth] Failed to send passcode:', error);
    return { success: false, error: error.message };
  }
}

async function sendPasscodeEmail(email: string, code: string, type: string) {
  // Always log to console for development
  console.log(`
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    📧 Email to: ${email}
    🔐 Your Memora ${type} code: ${code}
    ⏰ Expires in 10 minutes
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #8b5cf6;">Memora Verification</h2>
      <p>Your ${type} verification code is:</p>
      <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">${code}</span>
      </div>
      <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes.</p>
      <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
    </div>
  `;

  // Option 1: Send via SendGrid
  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
    try {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: `Your Memora ${type} code`,
        text: `Your verification code is: ${code}\n\nThis code will expire in 10 minutes.`,
        html: emailHtml,
      });
      
      console.log(`[Email] Successfully sent ${type} code to ${email} via SendGrid`);
      return;
    } catch (error: any) {
      console.error('[Email] Failed to send via SendGrid:', error.message);
    }
  }

  // Option 2: Send via Gmail SMTP
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `"Memora" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: `Your Memora ${type} code`,
        text: `Your verification code is: ${code}\n\nThis code will expire in 10 minutes.`,
        html: emailHtml,
      });

      console.log(`[Email] Successfully sent ${type} code to ${email} via Gmail`);
      return;
    } catch (error: any) {
      console.error('[Email] Failed to send via Gmail:', error.message);
    }
  }

  console.log('[Email] No email service configured. Set either:');
  console.log('  - SENDGRID_API_KEY + SENDGRID_FROM_EMAIL, or');
  console.log('  - GMAIL_USER + GMAIL_APP_PASSWORD');
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

export async function verifyPasscode(
  email: string,
  code: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const normalizedEmail = email.toLowerCase();

    // Find valid passcode
    const response = await client.search({
      index: PASSCODES_INDEX,
      body: {
        query: {
          bool: {
            must: [
              { term: { email: normalizedEmail } },
              { term: { code } },
              { term: { used: false } },
              { range: { expires_at: { gte: 'now' } } },
            ],
          },
        },
        sort: [{ created_at: { order: 'desc' } }],
        size: 1,
      },
    });

    if (response.hits.hits.length === 0) {
      return { success: false, error: 'Invalid or expired code' };
    }

    const passcodeDoc = response.hits.hits[0];
    const passcode = passcodeDoc._source as Passcode;

    console.log(`[Auth] Verifying passcode type: ${passcode.type} for ${normalizedEmail}`);

    // Mark passcode as used
    await client.update({
      index: PASSCODES_INDEX,
      id: passcodeDoc._id as string,
      body: {
        doc: { used: true },
      },
      refresh: true,
    });

    // For signup, just verify the code without creating user
    // User will be created when they set their password
    if (passcode.type === 'signup') {
      console.log(`[Auth] Email verified for signup: ${normalizedEmail}`);
      return { success: true };
    }

    // For login/reset, get existing user
    let user = await getUserByEmail(normalizedEmail);
    
    if (!user) {
      return { success: false, error: 'User not found. Please sign up first.' };
    }

    // Update last login
    await client.update({
      index: USERS_INDEX,
      id: user.user_id,
      body: {
        doc: {
          last_login: new Date().toISOString(),
          is_verified: true,
        },
      },
      refresh: true,
    });

    console.log(`[Auth] User ${user.email} authenticated successfully`);
    return { success: true, user };
  } catch (error: any) {
    console.error('[Auth] Verification failed:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const response = await client.search({
      index: USERS_INDEX,
      body: {
        query: {
          term: { email: email.toLowerCase() },
        },
        size: 1,
      },
    });

    if (response.hits.hits.length === 0) {
      return null;
    }

    return response.hits.hits[0]._source as User;
  } catch (error) {
    return null;
  }
}

async function createUser(email: string): Promise<User> {
  const userId = 'user-' + Math.random().toString(36).substr(2, 9);
  const now = new Date().toISOString();

  const user: User = {
    user_id: userId,
    email: email.toLowerCase(),
    created_at: now,
    is_verified: false,
  };

  await client.index({
    index: USERS_INDEX,
    id: userId,
    body: user,
    refresh: true,
  });

  console.log(`[Auth] Created new user: ${email}`);
  return user;
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const response = await client.get({
      index: USERS_INDEX,
      id: userId,
    });
    return response._source as User;
  } catch (error) {
    return null;
  }
}

// ============================================================================
// LEGACY SUPPORT
// ============================================================================

// ============================================================================
// PASSWORD-BASED AUTHENTICATION
// ============================================================================

export async function signupWithPassword(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    await createAuthIndices();
    const normalizedEmail = email.toLowerCase();

    console.log(`[Auth] Attempting password signup for: ${normalizedEmail}`);

    // Check if user already exists
    const existingUser = await getUserByEmail(normalizedEmail);
    if (existingUser) {
      console.log(`[Auth] User already exists: ${normalizedEmail}, has password: ${!!existingUser.password_hash}`);
      return { success: false, error: 'User already exists. Please login instead.' };
    }

    // Validate password
    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long' };
    }

    // Create user with password
    const userId = 'user-' + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);

    const user: User = {
      user_id: userId,
      email: normalizedEmail,
      password_hash: passwordHash,
      created_at: now,
      last_login: now,
      is_verified: true, // Auto-verify for password signups
    };

    await client.index({
      index: USERS_INDEX,
      id: userId,
      body: user,
      refresh: true,
    });

    console.log(`[Auth] Created new user with password: ${email}`);
    
    // Return user without password_hash
    const { password_hash, ...userWithoutPassword } = user;
    return { success: true, user: userWithoutPassword };
  } catch (error: any) {
    console.error('[Auth] Signup failed:', error);
    return { success: false, error: error.message };
  }
}

export async function loginWithPassword(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const normalizedEmail = email.toLowerCase();

    console.log(`[Auth] Login attempt for: ${normalizedEmail}`);

    // Get user
    const user = await getUserByEmail(normalizedEmail);
    if (!user) {
      console.log(`[Auth] User not found: ${normalizedEmail}`);
      return { success: false, error: 'Invalid email or password' };
    }

    console.log(`[Auth] User found: ${normalizedEmail}, has password_hash: ${!!user.password_hash}`);

    // Check if user has a password set
    if (!user.password_hash) {
      console.log(`[Auth] User has no password_hash`);
      return { success: false, error: 'Please use email code login for this account' };
    }

    // Verify password
    console.log(`[Auth] Verifying password...`);
    console.log(`[Auth] Stored hash: ${user.password_hash.substring(0, 20)}...`);
    const isValid = verifyPassword(password, user.password_hash);
    console.log(`[Auth] Password valid: ${isValid}`);
    
    if (!isValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Update last login
    await client.update({
      index: USERS_INDEX,
      id: user.user_id,
      body: {
        doc: {
          last_login: new Date().toISOString(),
        },
      },
      refresh: true,
    });

    console.log(`[Auth] User ${user.email} logged in with password`);
    
    // Return user without password_hash
    const { password_hash, ...userWithoutPassword } = user;
    return { success: true, user: userWithoutPassword };
  } catch (error: any) {
    console.error('[Auth] Login failed:', error);
    return { success: false, error: error.message };
  }
}

export function requireUser(): string {
  const user = process.env.DEMO_USER_ID || 'u_demo';
  return user;
}
