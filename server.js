const express = require('express');
const mongoose = require('mongoose');
const cookieSession = require('cookie-session');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const Account = require('./models/Account');

const app = express();
const PORT = process.env.PORT || 3000;

// CSRF Token Store (in-memory; in production use Redis)
const csrfTokens = new Map();
const MAX_CSRF_TOKENS = 10000;

// Rate limiting store for login attempts
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_SEND_RECIPIENTS = 50;
const MAX_LOCK_REASON_LENGTH = 255;

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://accounts.google.com https://www.googleapis.com");
  next();
});

// Middleware setup
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration with environment-based secrets
const sessionKeys = process.env.SESSION_KEYS
  ? process.env.SESSION_KEYS.split(',')
  : ['default-key-change-in-production'];

if (!process.env.SESSION_KEYS) {
  console.warn('⚠️  WARNING: SESSION_KEYS not set in environment. Using insecure default.');
}

app.use(cookieSession({
  maxAge: 30 * 60 * 1000, // 30 minutes for admin sessions
  keys: sessionKeys,
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'strict'
}));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'static')));

// MongoDB Connection with improved configuration
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ FATAL: MONGO_URI or MONGODB_URI environment variable not set');
  process.exit(1);
}

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ Connected to MongoDB Atlas');
  console.log('📊 Database ready for operations');
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.error('💡 Please check:');
  console.error('   1. MongoDB Atlas IP whitelist (add 0.0.0.0/0 for all IPs)');
  console.error('   2. Database credentials are correct');
  console.error('   3. Network connectivity');

  // Don't exit the process, let it continue with limited functionality
  console.log('⚠️  Server will continue without database functionality');
});

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('🛑 MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during graceful shutdown:', err);
    process.exit(1);
  }
});

// Google OAuth2 Configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.OAUTH_CALLBACK_URL || 'https://mail-service-pro.onrender.com/auth/google/callback'
);

// OAuth scopes for Gmail and user profile access
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

/**
 * Helper: Generate CSRF token
 */
function generateCSRFToken() {
  const token = crypto.randomBytes(32).toString('hex');

  // Clean up old tokens if we have too many
  if (csrfTokens.size > MAX_CSRF_TOKENS) {
    const firstKey = csrfTokens.keys().next().value;
    csrfTokens.delete(firstKey);
  }

  // Set token to expire in 1 hour
  csrfTokens.set(token, { expires: Date.now() + 3600000 });
  return token;
}

/**
 * Helper: Verify CSRF token
 */
function verifyCSRFToken(token) {
  if (!token || !csrfTokens.has(token)) {
    return false;
  }

  const tokenData = csrfTokens.get(token);
  if (Date.now() > tokenData.expires) {
    csrfTokens.delete(token);
    return false;
  }

  // Consume token (one-time use)
  csrfTokens.delete(token);
  return true;
}

/**
 * Helper: Check login rate limit
 */
function checkLoginRateLimit(ipOrEmail) {
  const now = Date.now();

  if (!loginAttempts.has(ipOrEmail)) {
    loginAttempts.set(ipOrEmail, []);
  }

  const attempts = loginAttempts.get(ipOrEmail);

  // Remove attempts outside the window
  while (attempts.length > 0 && now - attempts[0] > LOGIN_ATTEMPT_WINDOW) {
    attempts.shift();
  }

  if (attempts.length >= MAX_LOGIN_ATTEMPTS) {
    return false; // Rate limited
  }

  attempts.push(now);
  return true;
}

/**
 * Middleware: Check if user is admin (password-protected)
 */
const checkAdmin = (req, res, next) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({
      error: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

/**
 * Middleware: Check if user can access a specific Gmail account
 * Access is allowed if:
 * 1. User owns the account, OR
 * 2. Account is not premium (public access), OR
 * 3. User is admin
 */
const checkAccess = async (req, res, next) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: 'Database temporarily unavailable. Please try again later.'
      });
    }

    const { email } = req.params;
    const userEmail = req.session.userEmail;
    const isAdmin = req.session.isAdmin;

    // Find the requested account in database
    const account = await Account.findOne({ email: email.toLowerCase() });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // If account is premium, only allow access to owner or admin
    if (account.isPremium) {
      const isOwner = userEmail === email.toLowerCase();
      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          error: 'This is a premium account. Only the owner or admin can access it.',
          isPremium: true
        });
      }
    }

    req.account = account;
    return next();

  } catch (error) {
    console.error('Access check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Routes

/**
 * Helper: Extract body part from email payload
 */
function extractEmailPart(payload, mimeType) {
  if (!payload) return null;

  if (payload.mimeType === mimeType && payload.body.data) {
    return Buffer.from(payload.body.data, 'base64').toString();
  }

  if (payload.parts) {
    const part = payload.parts.find(p => p.mimeType === mimeType);
    if (part && part.body.data) {
      return Buffer.from(part.body.data, 'base64').toString();
    }
  }

  return null;
}

/**
 * Helper: Get raw email as MIME string
 */
function getRawEmail(data) {
  if (data.raw) {
    return Buffer.from(data.raw, 'base64').toString();
  }

  // Construct raw-like view from full payload
  if (data.payload && data.payload.headers) {
    const headers = data.payload.headers;
    let rawStr = headers.map(h => `${h.name}: ${h.value}`).join('\n');
    rawStr += '\n\n';

    // Append body content
    const textBody = extractEmailPart(data.payload, 'text/plain');
    const htmlBody = extractEmailPart(data.payload, 'text/html');
    if (textBody) {
      rawStr += textBody;
    } else if (htmlBody) {
      rawStr += htmlBody;
    }
    return rawStr;
  }

  return null;
}

/**
 * Helper: Sanitize HTML to prevent script execution
 */
function sanitizeHtml(html) {
  if (!html) return '';

  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<embed\b[^<]*>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
}

/**
 * Helper: Extract attachments metadata from email payload
 */
function extractAttachments(payload) {
  const attachments = [];

  if (!payload) return attachments;

  // Check if payload has parts (multipart message)
  if (payload.parts) {
    payload.parts.forEach((part, index) => {
      // Check if part has a filename (indicates attachment)
      if (part.filename) {
        attachments.push({
          id: part.partId,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size || 0,
          index: index
        });
      }
    });
  }

  return attachments;
}

/**
 * Helper: Extract extended header metadata
 */
function extractHeaderMetadata(headers) {
  const getHeader = (name) => headers.find(h => h.name === name)?.value || '';

  return {
    contentType: getHeader('Content-Type') || 'text/plain',
    encoding: getHeader('Content-Transfer-Encoding') || '7bit',
    from: getHeader('From'),
    to: getHeader('To'),
    cc: getHeader('Cc'),
    bcc: getHeader('Bcc'),
    subject: getHeader('Subject'),
    date: getHeader('Date'),
    messageId: getHeader('Message-ID'),
    inReplyTo: getHeader('In-Reply-To'),
    references: getHeader('References'),
    mimeVersion: getHeader('MIME-Version') || '1.0'
  };
}

// Routes

/**
 * GET /csrf-token - Generate CSRF token for forms
 */
app.get('/csrf-token', (req, res) => {
  const token = generateCSRFToken();
  res.json({ csrfToken: token });
});

/**
 * GET /logout - Clear admin session and redirect to home
 */
app.get('/logout', (req, res) => {
  req.session = null;
  res.clearCookie('session');
  res.clearCookie('session.sig');
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * GET / - Landing page
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

/**
 * GET /privacy - Privacy Policy page
 */
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'privacy.html'));
});

/**
 * GET /terms - Terms of Service page
 */
app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'terms.html'));
});

/**
 * GET /author - Author profile page
 */
app.get('/author', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'author.html'));
});

/**
 * GET /credits - Credits and hosting thanks page
 */
app.get('/credits', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'credits.html'));
});

/**
 * GET /about.html - About page
 */
app.get('/about.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'about.html'));
});

/**
 * GET /auth/google - Initiate Google OAuth2 flow
 */
app.get('/auth/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  
  console.log('🔄 Redirecting to Google OAuth:', authUrl);
  res.redirect(authUrl);
});

/**
 * GET /auth/google/callback - Handle OAuth2 callback from Google
 */
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('Authorization code not provided');
  }
  
  try {
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Get user profile information
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();
    
    const userEmail = profile.email.toLowerCase();
    
    // Store or update user account in database (with error handling)
    if (mongoose.connection.readyState === 1) {
      try {
        await Account.findOneAndUpdate(
          { email: userEmail },
          { 
            email: userEmail,
            refreshToken: tokens.refresh_token,
            lastAccessed: new Date()
          },
          { 
            upsert: true,
            new: true,
            timeout: 10000 // 10 second timeout
          }
        );
        console.log('✅ User account saved to database:', userEmail);
      } catch (dbError) {
        console.error('❌ Database save error:', dbError.message);
        // Continue without saving to database
        console.log('⚠️  Continuing without database save');
      }
    } else {
      console.log('⚠️  Database not connected, skipping account save');
    }
    
    // Store user email in session
    req.session.userEmail = userEmail;
    
    console.log('✅ User authenticated:', userEmail);
    
    // Redirect to inbox with the connected account
    res.redirect('/inbox.html');
    
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

/**
 * GET /inbox/:email - Retrieve inbox emails for specified Gmail account
 */
app.get('/inbox/:email', checkAccess, async (req, res) => {
  try {
    const { account } = req;
    
    // Set up OAuth2 client with stored refresh token
    const accountOAuth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://mail-service-pro.onrender.com/auth/google/callback'
    );
    
    accountOAuth.setCredentials({
      refresh_token: account.refreshToken
    });
    
    // Initialize Gmail API
    const gmail = google.gmail({ version: 'v1', auth: accountOAuth });
    
    // Get list of messages from inbox (last 10)
    const { data: messageList } = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['INBOX'],
      maxResults: 10
    });
    
    if (!messageList.messages) {
      return res.json({ emails: [], account: account.email });
    }
    
    // Get detailed information for each message
    const emailPromises = messageList.messages.map(async (message) => {
      const { data } = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date']
      });
      
      const headers = data.payload.headers;
      const getHeader = (name) => headers.find(h => h.name === name)?.value || '';
      
      return {
        id: message.id,
        subject: getHeader('Subject'),
        from: getHeader('From'),
        date: getHeader('Date'),
        snippet: data.snippet
      };
    });
    
    const emails = await Promise.all(emailPromises);
    
    // Update last accessed timestamp
    await Account.findByIdAndUpdate(account._id, { lastAccessed: new Date() });
    
    console.log(`📧 Retrieved ${emails.length} emails for ${account.email}`);
    res.json({ 
      emails, 
      account: account.email,
      isPremium: account.isPremium
    });
    
  } catch (error) {
    console.error('❌ Inbox fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

/**
 * GET /email/:email/:messageId - Get full email content with multi-view support
 */
app.get('/email/:email/:messageId', checkAccess, async (req, res) => {
  try {
    const { account } = req;
    const { messageId } = req.params;

    // Set up OAuth2 client with stored refresh token
    const accountOAuth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://mail-service-pro.onrender.com/auth/google/callback'
    );

    accountOAuth.setCredentials({
      refresh_token: account.refreshToken
    });

    // Initialize Gmail API
    const gmail = google.gmail({ version: 'v1', auth: accountOAuth });

    // Get full message content
    const { data } = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    const headers = data.payload.headers;
    const getHeader = (name) => headers.find(h => h.name === name)?.value || '';

    // Extract all view formats
    const plainText = extractEmailPart(data.payload, 'text/plain');
    const htmlContent = extractEmailPart(data.payload, 'text/html');
    const rawEmail = getRawEmail(data);

    // Determine primary content type and auto-select initial view
    let contentType = 'text';
    let primaryContent = plainText || '';

    if (htmlContent && !plainText) {
      contentType = 'html';
      primaryContent = sanitizeHtml(htmlContent);
    } else if (htmlContent && plainText) {
      contentType = 'multipart';
      primaryContent = plainText;
    }

    res.json({
      id: messageId,
      subject: getHeader('Subject'),
      from: getHeader('From'),
      to: getHeader('To'),
      date: getHeader('Date'),
      contentType: contentType,
      views: {
        raw: rawEmail || plainText || htmlContent || '',
        html: htmlContent ? sanitizeHtml(htmlContent) : null,
        text: plainText || null
      },
      body: primaryContent,
      snippet: data.snippet
    });

  } catch (error) {
    console.error('❌ Email fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

/**
 * GET /accounts - List all stored Gmail accounts (Admin only)
 */
app.get('/accounts', checkAdmin, async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: 'Database temporarily unavailable. Please try again later.',
        accounts: []
      });
    }

    const accounts = await Account.find({}).select({
      email: 1,
      isPremium: 1,
      lock: 1,
      createdAt: 1,
      lastAccessed: 1
    }).sort({ createdAt: -1 });

    console.log(`👨‍💼 Admin requested accounts list`);
    res.json({ accounts });

  } catch (error) {
    console.error('❌ Accounts fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch accounts: ' + error.message,
      accounts: []
    });
  }
});

/**
 * GET /available-accounts - Get accounts available to current user
 */
app.get('/available-accounts', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.json({ 
        accounts: [],
        message: 'Database temporarily unavailable'
      });
    }
    
    const userEmail = req.session.userEmail;
    const isAdmin = req.session.isAdmin;
    
    let query = {};
    
    if (!isAdmin && userEmail) {
      // Regular users can see their own accounts and non-premium accounts
      query = {
        $or: [
          { email: userEmail },
          { isPremium: false }
        ]
      };
    } else if (isAdmin) {
      // Admin can see all accounts
      query = {};
    } else {
      // Non-authenticated users can only see non-premium accounts
      query = { isPremium: false };
    }
    
    const accounts = await Account.find(query).select({
      email: 1,
      isPremium: 1
    }).sort({ email: 1 });
    
    res.json({ accounts });
    
  } catch (error) {
    console.error('❌ Available accounts fetch error:', error);
    res.json({ 
      accounts: [],
      error: 'Failed to fetch available accounts: ' + error.message
    });
  }
});

/**
 * POST /admin/lock/:email - Lock account with reason and optional expiry - Admin only
 * Body: { reason: string, expiry: optional ISO date string }
 */
app.post('/admin/lock/:email', checkAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    const { reason, expiry } = req.body;
    const adminEmail = req.session.userEmail || 'admin';

    if (!reason) {
      return res.status(400).json({ error: 'Lock reason is required' });
    }

    const account = await Account.findOne({ email: email.toLowerCase() });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Lock account with metadata
    account.isPremium = true;
    account.lock = {
      isLocked: true,
      reason: reason,
      actor: adminEmail,
      timestamp: new Date(),
      expiry: expiry ? new Date(expiry) : null,
      unlockHistory: account.lock?.unlockHistory || []
    };

    // Add audit log entry
    if (!account.adminAuditLog) {
      account.adminAuditLog = [];
    }

    account.adminAuditLog.push({
      timestamp: new Date(),
      action: 'account_locked',
      admin: adminEmail,
      details: `Account locked with reason: ${reason}`,
      newValue: {
        reason: reason,
        expiry: expiry || null
      },
      status: 'success'
    });

    await account.save();

    console.log(`🔒 Admin locked account: ${email} (reason: ${reason})`);

    res.json({
      success: true,
      message: `Account ${email} locked`,
      account: {
        email: account.email,
        isPremium: account.isPremium,
        lock: account.lock
      }
    });

  } catch (error) {
    console.error('❌ Account lock error:', error);
    res.status(500).json({ error: 'Failed to lock account' });
  }
});

/**
 * POST /admin/unlock/:email - Unlock account (make public) - Admin only
 * Body: { reason: optional unlock reason }
 */
app.post('/admin/unlock/:email', checkAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    const { reason } = req.body;
    const adminEmail = req.session.userEmail || 'admin';

    const account = await Account.findOne({ email: email.toLowerCase() });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Record unlock in history before unlocking
    if (!account.lock) {
      account.lock = {
        isLocked: false,
        reason: null,
        actor: null,
        timestamp: null,
        expiry: null,
        unlockHistory: []
      };
    }

    if (account.lock.isLocked) {
      account.lock.unlockHistory.push({
        unlockedAt: new Date(),
        unlockedBy: adminEmail,
        reason: reason || 'No reason provided'
      });
    }

    // Unlock account (make public)
    account.isPremium = false;
    account.lock.isLocked = false;

    await account.save();

    console.log(`🔓 Admin unlocked account: ${email}`);

    res.json({
      success: true,
      message: `Account ${email} unlocked`,
      account: {
        email: account.email,
        isPremium: account.isPremium,
        lock: account.lock
      }
    });

  } catch (error) {
    console.error('❌ Account unlock error:', error);
    res.status(500).json({ error: 'Failed to unlock account' });
  }
});

/**
 * GET /admin/lock-history/:email - Get lock/unlock history for an account - Admin only
 */
app.get('/admin/lock-history/:email', checkAdmin, async (req, res) => {
  try {
    const { email } = req.params;

    const account = await Account.findOne({ email: email.toLowerCase() });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const lockData = account.lock || {
      isLocked: false,
      reason: null,
      actor: null,
      timestamp: null,
      expiry: null,
      unlockHistory: []
    };

    res.json({
      email: account.email,
      currentLockStatus: {
        isLocked: lockData.isLocked,
        reason: lockData.reason,
        actor: lockData.actor,
        timestamp: lockData.timestamp,
        expiry: lockData.expiry
      },
      unlockHistory: lockData.unlockHistory || [],
      totalUnlocks: (lockData.unlockHistory || []).length
    });

  } catch (error) {
    console.error('❌ Lock history fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch lock history' });
  }
});

/**
 * GET /admin/accounts/search - Search and filter accounts - Admin only
 * Query params: search (email), locked (true/false), premium (true/false)
 */
app.get('/admin/accounts/search', checkAdmin, async (req, res) => {
  try {
    const { search, locked, premium } = req.query;

    let query = {};

    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }

    if (locked !== undefined) {
      const isLocked = locked === 'true';
      query['lock.isLocked'] = isLocked;
    }

    if (premium !== undefined) {
      const isPremium = premium === 'true';
      query.isPremium = isPremium;
    }

    const accounts = await Account.find(query).select({
      email: 1,
      isPremium: 1,
      lock: 1,
      createdAt: 1,
      lastAccessed: 1
    }).sort({ createdAt: -1 });

    const total = accounts.length;
    const locked_count = accounts.filter(a => a.lock?.isLocked).length;
    const premium_count = accounts.filter(a => a.isPremium).length;

    res.json({
      total,
      locked_count,
      premium_count,
      accounts
    });

  } catch (error) {
    console.error('❌ Account search error:', error);
    res.status(500).json({ error: 'Failed to search accounts' });
  }
});

/**
 * GET /admin - Serve admin dashboard
 */
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'admin.html'));
});

/**
 * POST /admin/login - Admin login with password and rate limiting
 */
app.post('/admin/login', (req, res) => {
  const { password, csrfToken } = req.body;

  // Validate CSRF token for POST request
  if (!csrfToken || !verifyCSRFToken(csrfToken)) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }

  // Get client IP (useful for rate limiting)
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  // Check rate limit
  if (!checkLoginRateLimit(clientIP)) {
    console.warn(`🚨 Login rate limit exceeded for IP: ${clientIP}`);
    return res.status(429).json({
      error: 'Too many login attempts. Please try again later.',
      retryAfter: Math.ceil(LOGIN_ATTEMPT_WINDOW / 1000)
    });
  }

  // Get admin password from environment variable
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('❌ ADMIN_PASSWORD environment variable not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (password === adminPassword) {
    req.session.isAdmin = true;
    req.session.adminLoginTime = Date.now();
    console.log(`✅ Admin login successful from IP: ${clientIP}`);
    res.json({ success: true, message: 'Admin login successful' });
  } else {
    console.warn(`⚠️  Failed admin login attempt from IP: ${clientIP}`);
    res.status(401).json({ error: 'Invalid admin password' });
  }
});

/**
 * POST /send - Send email via Gmail API
 * Requires: email (sender), to (recipient or array), subject, body
 * Optional: cc, bcc (comma-separated or arrays), isHtml (boolean)
 * Features: validation, rate-limiting, activity tracking, HTML support, multiple recipients
 */
app.post('/send', async (req, res) => {
  try {
    const { email, to, subject, body, cc, bcc, isHtml } = req.body;
    const userEmail = req.session.userEmail;

    // Validation
    if (!email || !to || !subject || !body) {
      return res.status(400).json({
        error: 'Missing required fields: email, to, subject, body'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid sender email address format'
      });
    }

    // Parse recipients (handle both array and string formats)
    const parseRecipients = (recipients) => {
      if (Array.isArray(recipients)) {
        return recipients.filter(r => emailRegex.test(r.trim())).map(r => r.trim());
      }
      if (typeof recipients === 'string') {
        return recipients
          .split(',')
          .map(r => r.trim())
          .filter(r => r && emailRegex.test(r));
      }
      return [];
    };

    const recipientsTo = parseRecipients(to);
    const recipientsCc = parseRecipients(cc);
    const recipientsBcc = parseRecipients(bcc);

    if (recipientsTo.length === 0) {
      return res.status(400).json({
        error: 'At least one valid recipient is required in the To field'
      });
    }

    // Validate Cc and Bcc have valid emails if provided
    const allCcBcc = [...recipientsCc, ...recipientsBcc];
    if ((cc || bcc) && allCcBcc.length === 0) {
      return res.status(400).json({
        error: 'Cc or Bcc fields contain invalid email addresses'
      });
    }

    // Access control: user can only send from their own accounts
    if (userEmail !== email.toLowerCase()) {
      return res.status(403).json({
        error: 'You can only send emails from your own account'
      });
    }

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: 'Database temporarily unavailable. Please try again later.'
      });
    }

    // Find the account
    const account = await Account.findOne({ email: email.toLowerCase() });
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Rate limiting: check last email sent time
    const RATE_LIMIT_INTERVAL = 2000; // 2 seconds between emails
    if (account.lastSentEmail) {
      const timeSinceLastEmail = Date.now() - new Date(account.lastSentEmail).getTime();
      if (timeSinceLastEmail < RATE_LIMIT_INTERVAL) {
        return res.status(429).json({
          error: 'Please wait before sending another email',
          retryAfter: Math.ceil((RATE_LIMIT_INTERVAL - timeSinceLastEmail) / 1000)
        });
      }
    }

    // Set up OAuth2 client with stored refresh token
    const accountOAuth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://mail-service-pro.onrender.com/auth/google/callback'
    );

    accountOAuth.setCredentials({
      refresh_token: account.refreshToken
    });

    // Initialize Gmail API
    const gmail = google.gmail({ version: 'v1', auth: accountOAuth });

    // Sanitize HTML if provided
    const sanitizedBody = isHtml ? sanitizeHtml(body) : body;

    // Construct email message with proper MIME format
    const headers = [
      `From: ${email}`,
      `To: ${recipientsTo.join(', ')}`,
      ...(recipientsCc.length > 0 ? [`Cc: ${recipientsCc.join(', ')}`] : []),
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset="UTF-8"`,
    ];

    // If HTML, ensure proper encoding
    if (isHtml) {
      headers.push(`Content-Transfer-Encoding: quoted-printable`);
    }

    const emailMessage = [
      ...headers,
      '',
      isHtml ? sanitizedBody : sanitizedBody
    ].join('\r\n');

    // Add Bcc recipients to headers for Gmail API (not in actual message headers)
    const messageBody = isHtml && isHtml.length > 0
      ? emailMessage
      : emailMessage;

    // Encode to base64 for Gmail API
    const encodedMessage = Buffer.from(messageBody).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send the email
    const sendRes = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    // Record sending activity in database
    account.lastSentEmail = new Date();
    const recipientName = recipientsTo[0].split('@')[0];
    const totalRecipients = recipientsTo.length + recipientsCc.length + recipientsBcc.length;

    account.sendingActivity.push({
      timestamp: new Date(),
      recipientEmail: recipientsTo.join(', '),
      ccEmail: recipientsCc.length > 0 ? recipientsCc.join(', ') : null,
      bccEmail: recipientsBcc.length > 0 ? recipientsBcc.join(', ') : null,
      recipientName: recipientName,
      subject: subject,
      totalRecipients: totalRecipients,
      isHtml: isHtml || false,
      status: 'success'
    });

    // Keep only last 50 sending activities for storage efficiency
    if (account.sendingActivity.length > 50) {
      account.sendingActivity = account.sendingActivity.slice(-50);
    }

    await account.save();

    console.log(`📧 Email sent from ${email} to ${recipientsTo.length} recipient(s) (Cc: ${recipientsCc.length}, Bcc: ${recipientsBcc.length}): "${subject}"`);

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: sendRes.data.id,
      recipients: totalRecipients,
      subject: subject
    });

  } catch (error) {
    console.error('❌ Send email error:', error.message);

    // Try to record failed attempt
    try {
      const { email } = req.body;
      if (email) {
        const account = await Account.findOne({ email: email.toLowerCase() });
        if (account) {
          const recipientName = req.body.to ? (Array.isArray(req.body.to) ? req.body.to[0] : req.body.to).split('@')[0] : 'unknown';
          account.sendingActivity.push({
            timestamp: new Date(),
            recipientEmail: Array.isArray(req.body.to) ? req.body.to.join(', ') : req.body.to || 'unknown',
            recipientName: recipientName,
            subject: req.body.subject || 'unknown',
            status: 'failed',
            errorMessage: error.message
          });
          await account.save();
        }
      }
    } catch (dbError) {
      console.error('❌ Failed to record send error:', dbError.message);
    }

    res.status(500).json({
      error: 'Failed to send email',
      details: error.message
    });
  }
});

/**
 * GET /sending-activity/:email - Get sending activity for an account (Admin only)
 */
app.get('/sending-activity/:email', checkAdmin, async (req, res) => {
  try {
    const { email } = req.params;

    const account = await Account.findOne({ email: email.toLowerCase() });
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Return last 20 sending activities
    const activity = account.sendingActivity.slice(-20).reverse();

    res.json({
      email: account.email,
      totalSent: account.sendingActivity.length,
      recentActivity: activity
    });

  } catch (error) {
    console.error('❌ Sending activity fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch sending activity' });
  }
});

/**
 * GET /admin/dashboard/analytics - Get real-time dashboard statistics - Admin only
 */
app.get('/admin/dashboard/analytics', checkAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: 'Database temporarily unavailable'
      });
    }

    const accounts = await Account.find({}).select({
      email: 1,
      isPremium: 1,
      lock: 1,
      createdAt: 1,
      lastAccessed: 1,
      sendingActivity: 1,
      quotaConfig: 1
    });

    const totalAccounts = accounts.length;
    const premiumAccounts = accounts.filter(a => a.isPremium).length;
    const lockedAccounts = accounts.filter(a => a.lock?.isLocked).length;
    const totalEmailsSent = accounts.reduce((sum, a) => sum + (a.sendingActivity?.length || 0), 0);

    // Calculate sending activity in last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const emailsLast24h = accounts.reduce((sum, a) => {
      const count = (a.sendingActivity || []).filter(activity =>
        new Date(activity.timestamp) > last24Hours
      ).length;
      return sum + count;
    }, 0);

    // Calculate send failures
    const failedEmails = accounts.reduce((sum, a) => {
      const count = (a.sendingActivity || []).filter(activity =>
        activity.status === 'failed'
      ).length;
      return sum + count;
    }, 0);

    // Get accounts with quota limits
    const accountsWithQuota = accounts.filter(a =>
      a.quotaConfig?.dailyLimit || a.quotaConfig?.monthlyLimit
    ).length;

    // Calculate hourly send stats for heat map
    const hourlyStats = {};
    for (let i = 0; i < 24; i++) {
      hourlyStats[i] = 0;
    }

    const now = new Date();
    accounts.forEach(account => {
      (account.sendingActivity || []).forEach(activity => {
        const actDate = new Date(activity.timestamp);
        // Check if activity is from today
        if (actDate.toDateString() === now.toDateString()) {
          const hour = actDate.getHours();
          hourlyStats[hour]++;
        }
      });
    });

    res.json({
      summary: {
        totalAccounts,
        premiumAccounts,
        publicAccounts: totalAccounts - premiumAccounts,
        lockedAccounts,
        accountsWithQuota
      },
      activity: {
        totalEmailsSent,
        emailsLast24h,
        failedEmails,
        successRate: totalEmailsSent > 0 ?
          Math.round(((totalEmailsSent - failedEmails) / totalEmailsSent) * 100) : 0
      },
      hourlyStats,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ Dashboard analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * POST /admin/account/:email/quota - Set send quota for account - Admin only
 * Body: { dailyLimit: number or null, monthlyLimit: number or null }
 */
app.post('/admin/account/:email/quota', checkAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    const { dailyLimit, monthlyLimit } = req.body;
    const adminEmail = req.session.userEmail || 'admin';

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: 'Database temporarily unavailable'
      });
    }

    const account = await Account.findOne({ email: email.toLowerCase() });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Record old values for audit
    const previousValue = {
      dailyLimit: account.quotaConfig?.dailyLimit,
      monthlyLimit: account.quotaConfig?.monthlyLimit
    };

    // Update quota config
    if (!account.quotaConfig) {
      account.quotaConfig = {
        dailyLimit: null,
        monthlyLimit: null,
        currentDayCount: 0,
        currentMonthCount: 0,
        lastDayReset: new Date(),
        lastMonthReset: new Date()
      };
    }

    account.quotaConfig.dailyLimit = dailyLimit || null;
    account.quotaConfig.monthlyLimit = monthlyLimit || null;

    // Add audit log entry
    if (!account.adminAuditLog) {
      account.adminAuditLog = [];
    }

    account.adminAuditLog.push({
      timestamp: new Date(),
      action: 'quota_set',
      admin: adminEmail,
      details: `Quota updated for account`,
      previousValue: previousValue,
      newValue: {
        dailyLimit,
        monthlyLimit
      },
      status: 'success'
    });

    await account.save();

    console.log(`✅ Admin set quota for ${email}: Daily=${dailyLimit || 'unlimited'}, Monthly=${monthlyLimit || 'unlimited'}`);

    res.json({
      success: true,
      message: `Quota updated for ${email}`,
      quotaConfig: account.quotaConfig
    });

  } catch (error) {
    console.error('❌ Quota set error:', error);
    res.status(500).json({ error: 'Failed to set quota' });
  }
});

/**
 * GET /admin/audit-log - Get full admin audit log - Admin only
 * Query params: email (filter by account), action (filter by action type), limit (default 100)
 */
app.get('/admin/audit-log', checkAdmin, async (req, res) => {
  try {
    const { email, action, limit = 100 } = req.query;

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: 'Database temporarily unavailable',
        auditLog: []
      });
    }

    let query = {};

    if (email) {
      query.email = new RegExp(email, 'i');
    }

    if (action) {
      query['adminAuditLog.action'] = action;
    }

    const accounts = await Account.find(query).select({
      email: 1,
      adminAuditLog: 1
    }).sort({ 'adminAuditLog.timestamp': -1 });

    // Flatten and merge audit logs from all accounts
    const auditLog = [];
    accounts.forEach(account => {
      (account.adminAuditLog || []).forEach(log => {
        auditLog.push({
          email: account.email,
          ...log.toObject ? log.toObject() : log
        });
      });
    });

    // Sort by timestamp descending
    auditLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply limit
    const limitedLog = auditLog.slice(0, parseInt(limit));

    res.json({
      total: auditLog.length,
      returned: limitedLog.length,
      auditLog: limitedLog
    });

  } catch (error) {
    console.error('❌ Audit log fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch audit log',
      auditLog: []
    });
  }
});

/**
 * POST /admin/bulk-action - Perform bulk operations on accounts - Admin only
 * Body: { action: 'lock'|'unlock', emails: [array], reason: string, expiry?: date }
 */
app.post('/admin/bulk-action', checkAdmin, async (req, res) => {
  try {
    const { action, emails, reason, expiry } = req.body;
    const adminEmail = req.session.userEmail || 'admin';

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: 'Database temporarily unavailable'
      });
    }

    if (!action || !emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        error: 'Invalid request: action and emails array required'
      });
    }

    if (!['lock', 'unlock'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action. Must be "lock" or "unlock"'
      });
    }

    if (action === 'lock' && !reason) {
      return res.status(400).json({
        error: 'Lock reason is required for bulk lock operation'
      });
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const emailAddr of emails) {
      try {
        const account = await Account.findOne({ email: emailAddr.toLowerCase() });

        if (!account) {
          results.failed.push({
            email: emailAddr,
            error: 'Account not found'
          });
          continue;
        }

        if (action === 'lock') {
          account.isPremium = true;
          account.lock = {
            isLocked: true,
            reason: reason,
            actor: adminEmail,
            timestamp: new Date(),
            expiry: expiry ? new Date(expiry) : null,
            unlockHistory: account.lock?.unlockHistory || []
          };
        } else if (action === 'unlock') {
          if (account.lock?.isLocked) {
            account.lock.unlockHistory.push({
              unlockedAt: new Date(),
              unlockedBy: adminEmail,
              reason: reason || 'Bulk unlock operation'
            });
          }
          account.isPremium = false;
          account.lock = {
            isLocked: false,
            reason: null,
            actor: null,
            timestamp: null,
            expiry: null,
            unlockHistory: account.lock?.unlockHistory || []
          };
        }

        // Add audit log
        if (!account.adminAuditLog) {
          account.adminAuditLog = [];
        }

        account.adminAuditLog.push({
          timestamp: new Date(),
          action: `account_${action}ed`,
          admin: adminEmail,
          details: `Bulk ${action} operation`,
          status: 'success'
        });

        await account.save();
        results.successful.push({ email: emailAddr, action });

      } catch (error) {
        results.failed.push({
          email: emailAddr,
          error: error.message
        });
      }
    }

    console.log(`📋 Admin performed bulk ${action} operation on ${results.successful.length} accounts`);

    res.json({
      success: true,
      action,
      results,
      summary: {
        total: emails.length,
        successful: results.successful.length,
        failed: results.failed.length
      }
    });

  } catch (error) {
    console.error('❌ Bulk action error:', error);
    res.status(500).json({ error: 'Failed to perform bulk action' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server only if running directly (not as module for Vercel)
if (require.main === module) {
  app.listen(PORT, () => {
    const adminPassword = process.env.ADMIN_PASSWORD || 'nafijpro++';
    console.log(`🚀 Mail Service running on port ${PORT}`);
    console.log(`📧 Gmail OAuth2 service ready`);
    console.log(`👨‍💼 Admin mode enabled (password configured via environment)`);
  });
}

module.exports = app;
