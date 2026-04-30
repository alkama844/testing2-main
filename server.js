const express = require('express');
const mongoose = require('mongoose');
const cookieSession = require('cookie-session');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

// Trust proxy for secure cookies behind reverse proxy (Render/Heroku)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;
const Account = require('./models/Account');

// Logging system
const logger = {
  info: (msg, data = {}) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data),
  warn: (msg, data = {}) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, data),
  error: (msg, error = {}) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, error),
  debug: (msg, data = {}) => process.env.DEBUG && console.log(`[DEBUG] ${new Date().toISOString()} - ${msg}`, data)
};

// Request timeout middleware
const REQUEST_TIMEOUT = 30000; // 30 seconds
app.use((req, res, next) => {
  req.setTimeout(REQUEST_TIMEOUT, () => {
    logger.warn('Request timeout', { path: req.path, method: req.method });
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout - operation took too long' });
    }
  });
  next();
});

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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
  // Let express determine secure status (works for local HTTP and prod HTTPS via trust proxy)
  httpOnly: true,
  sameSite: 'lax'
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
  process.env.OAUTH_CALLBACK_URL || 'https://mailpro-nafij.onrender.com/auth/google/callback'
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
  const isAdmin = req.session?.isAdmin === true;
  const sessionId = req.sessionID || 'no-session';

  logger.debug('Admin check', {
    sessionId,
    isAdmin,
    sessionData: req.session ? Object.keys(req.session) : 'no-session'
  });

  if (!isAdmin) {
    logger.warn('Access denied - not admin', { sessionId });
    return res.status(403).json({
      error: 'Access denied. Admin privileges required.',
      debug: process.env.DEBUG ? { isAdmin, sessionId } : undefined
    });
  }

  logger.info('Admin access granted', { sessionId });
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
 * Removes dangerous tags and event handlers to prevent XSS attacks
 */
function sanitizeHtml(html) {
  if (!html) return '';

  return html
    // Remove all script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers: onXXX="..." or onXXX='...'
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove event handlers: onXXX=value (no quotes)
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: protocol (can execute code)
    .replace(/data:text\/html/gi, '')
    // Remove vbscript: protocol
    .replace(/vbscript:/gi, '')
    // Remove iframe tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove embed tags
    .replace(/<embed\b[^<]*>/gi, '')
    // Remove object tags
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    // Remove form tags
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    // Remove input/button tags
    .replace(/<(input|button|textarea|select|option|label)\b[^<]*>/gi, '')
    // Remove meta/base/link tags
    .replace(/<(meta|base|link|style)\b[^<]*>/gi, '')
    // Remove svg tags (can contain scripts)
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    // Remove style attributes with potential code (expression, behavior, etc)
    .replace(/style\s*=\s*["']([^"']*(?:expression|behavior|binding)[^"']*)["']/gi, '');
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
  try {
    const token = generateCSRFToken();
    res.json({ csrfToken: token, timestamp: Date.now() });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    res.status(500).json({ error: 'Failed to generate security token' });
  }
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
      process.env.OAUTH_CALLBACK_URL || 'https://mailpro-nafij.onrender.com/auth/google/callback'
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
      process.env.OAUTH_CALLBACK_URL || 'https://mailpro-nafij.onrender.com/auth/google/callback'
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

    // Access control: user can only send from their own accounts, unless they are admin
    if (userEmail !== email.toLowerCase() && !req.session.isAdmin) {
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
      process.env.OAUTH_CALLBACK_URL || 'https://mailpro-nafij.onrender.com/auth/google/callback'
    );

    accountOAuth.setCredentials({
      refresh_token: account.refreshToken
    });

    // Initialize Gmail API
    const gmail = google.gmail({ version: 'v1', auth: accountOAuth });

    // For sending, we allow raw HTML so users can use <style> tags and proper templates.
    // The recipient's email client will handle its own security filtering.
    const finalBody = body;

    // Construct email message with proper MIME format
    const headers = [
      `From: ${email}`,
      `To: ${recipientsTo.join(', ')}`,
      ...(recipientsCc.length > 0 ? [`Cc: ${recipientsCc.join(', ')}`] : []),
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset="UTF-8"`,
      `Content-Transfer-Encoding: base64`
    ];

    // Encode the body in base64 to completely preserve HTML, CSS, and special characters
    // RFC 2045 requires base64 lines to be no longer than 76 characters
    const base64String = Buffer.from(finalBody, 'utf-8').toString('base64');
    const bodyEncoded = base64String.match(/.{1,76}/g)?.join('\r\n') || '';

    const emailMessage = [
      ...headers,
      '',
      bodyEncoded
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

    // Record to admin audit log for observability
    if (!account.adminAuditLog) {
      account.adminAuditLog = [];
    }

    account.adminAuditLog.push({
      timestamp: new Date(),
      action: 'email_sent',
      admin: userEmail || email,
      details: `Email sent to ${totalRecipients} recipient(s)`,
      previousValue: null,
      newValue: {
        to: recipientsTo,
        cc: recipientsCc,
        bcc: recipientsBcc,
        subject: subject,
        messageId: sendRes.data.id,
        isHtml: isHtml || false
      },
      status: 'success'
    });

    await account.save();

    console.log(`📧 Email sent from ${email} to ${recipientsTo.length} recipient(s) (Cc: ${recipientsCc.length}, Bcc: ${recipientsBcc.length}): "${subject}"`);

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: sendRes.data.id,
      recipients: totalRecipients,
      subject: subject,
      timestamp: new Date(),
      recipientSummary: {
        to: recipientsTo.length,
        cc: recipientsCc.length,
        bcc: recipientsBcc.length
      }
    });

  } catch (error) {
    console.error('❌ Send email error:', error.message);

    // Try to record failed attempt
    try {
      const { email, to, subject } = req.body;
      const userEmail = req.session.userEmail;
      if (email) {
        const account = await Account.findOne({ email: email.toLowerCase() });
        if (account) {
          const recipientName = to ? (Array.isArray(to) ? to[0] : to).split('@')[0] : 'unknown';
          const recipientEmail = Array.isArray(to) ? to.join(', ') : to || 'unknown';

          // Record to sending activity
          account.sendingActivity.push({
            timestamp: new Date(),
            recipientEmail: recipientEmail,
            recipientName: recipientName,
            subject: subject || 'unknown',
            status: 'failed',
            errorMessage: error.message
          });

          // Record to admin audit log
          if (!account.adminAuditLog) {
            account.adminAuditLog = [];
          }

          account.adminAuditLog.push({
            timestamp: new Date(),
            action: 'email_sent',
            admin: userEmail || email,
            details: `Failed to send email: ${error.message}`,
            previousValue: null,
            newValue: {
              to: recipientEmail,
              subject: subject || 'unknown',
              errorMessage: error.message
            },
            status: 'failed'
          });

          if (account.sendingActivity.length > 50) {
            account.sendingActivity = account.sendingActivity.slice(-50);
          }

          await account.save();
        }
      }
    } catch (dbError) {
      console.error('❌ Failed to record send error:', dbError.message);
    }

    res.status(500).json({
      error: 'Failed to send email',
      details: error.message,
      timestamp: new Date()
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

/**
 * GET /admin/accounts/advanced-search - Advanced search with filtering - Admin only
 * Query params: email, locked, expiry_soon, activity_high
 */
app.get('/admin/accounts/advanced-search', checkAdmin, async (req, res) => {
  try {
    const { email, locked, expiry_soon, activity_high, sort_by = 'created' } = req.query;

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database temporarily unavailable' });
    }

    let query = {};

    if (email) {
      query.email = { $regex: email, $options: 'i' };
    }

    if (locked === 'true') {
      query['lock.isLocked'] = true;
    }

    const accounts = await Account.find(query)
      .select({
        email: 1,
        isPremium: 1,
        lock: 1,
        createdAt: 1,
        lastAccessed: 1,
        sendingActivity: 1,
        adminAuditLog: 1
      })
      .sort({ createdAt: -1 });

    // Filter by expiry
    let filtered = accounts;
    if (expiry_soon === 'true') {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      filtered = filtered.filter(acc => {
        if (acc.lock?.isLocked && acc.lock?.expiry) {
          const expiry = new Date(acc.lock.expiry);
          return expiry > now && expiry <= in24h;
        }
        return false;
      });
    }

    // Filter by activity
    if (activity_high === 'true') {
      filtered = filtered.filter(acc => {
        const activityCount = (acc.sendingActivity || []).length;
        return activityCount >= 10;
      });
    }

    res.json({
      total: filtered.length,
      accounts: filtered
    });

  } catch (error) {
    console.error('❌ Advanced search error:', error);
    res.status(500).json({ error: 'Failed to perform advanced search' });
  }
});

/**
 * GET /admin/monitoring/summary - Get comprehensive monitoring summary - Admin only
 */
app.get('/admin/monitoring/summary', checkAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database temporarily unavailable' });
    }

    const accounts = await Account.find({});

    // Calculate lock statistics
    const lockedAccounts = accounts.filter(a => a.lock?.isLocked);
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const expiringAccounts = lockedAccounts.filter(a => {
      if (a.lock?.expiry) {
        const expiry = new Date(a.lock.expiry);
        return expiry > now && expiry <= in24h;
      }
      return false;
    });
    const expiredAccounts = lockedAccounts.filter(a => {
      if (a.lock?.expiry) {
        const expiry = new Date(a.lock.expiry);
        return expiry <= now;
      }
      return false;
    });

    // Calculate activity statistics
    const totalActivity = accounts.reduce((sum, a) =>
      sum + ((a.sendingActivity || []).length + (a.adminAuditLog || []).length), 0);

    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentActivity = accounts.reduce((sum, a) => {
      const sends = (a.sendingActivity || []).filter(s => new Date(s.timestamp) > last24h).length;
      const audits = (a.adminAuditLog || []).filter(l => new Date(l.timestamp) > last24h).length;
      return sum + sends + audits;
    }, 0);

    // Most active accounts
    const accountActivity = accounts.map(a => ({
      email: a.email,
      sends: (a.sendingActivity || []).length,
      audits: (a.adminAuditLog || []).length,
      total: (a.sendingActivity || []).length + (a.adminAuditLog || []).length
    }))
      .filter(a => a.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Lock reasons breakdown
    const lockReasons = {};
    lockedAccounts.forEach(a => {
      const reason = a.lock?.reason || 'No reason provided';
      lockReasons[reason] = (lockReasons[reason] || 0) + 1;
    });

    res.json({
      timestamp: new Date(),
      summary: {
        totalAccounts: accounts.length,
        lockedAccounts: lockedAccounts.length,
        expiringAccounts: expiringAccounts.length,
        expiredAccounts: expiredAccounts.length,
        accountsNeedingAttention: expiringAccounts.length + expiredAccounts.length
      },
      activity: {
        totalEvents: totalActivity,
        last24hEvents: recentActivity,
        topAccounts: accountActivity
      },
      locks: {
        byReason: lockReasons,
        totalWithExpiry: lockedAccounts.filter(a => a.lock?.expiry).length
      }
    });

  } catch (error) {
    console.error('❌ Monitoring summary error:', error);
    res.status(500).json({ error: 'Failed to fetch monitoring summary' });
  }
});

/**
 * GET /admin/accounts/expiry-check - Check for expired locks - Admin only
 */
app.get('/admin/accounts/expiry-check', checkAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database temporarily unavailable' });
    }

    const now = new Date();
    const accounts = await Account.find({
      'lock.isLocked': true,
      'lock.expiry': { $lte: now }
    });

    const results = {
      expiredCount: accounts.length,
      autoUnlockPerformed: 0,
      failedAutoUnlock: []
    };

    // Auto-unlock expired accounts
    for (const account of accounts) {
      try {
        account.lock.unlockHistory.push({
          unlockedAt: new Date(),
          unlockedBy: 'system',
          reason: 'Lock expired automatically'
        });
        account.isPremium = false;
        account.lock.isLocked = false;

        account.adminAuditLog.push({
          timestamp: new Date(),
          action: 'account_unlocked',
          admin: 'system',
          details: 'Automatic unlock due to lock expiry',
          status: 'success'
        });

        await account.save();
        results.autoUnlockPerformed++;
        console.log(`🔓 Auto-unlocked expired account: ${account.email}`);
      } catch (error) {
        results.failedAutoUnlock.push({
          email: account.email,
          error: error.message
        });
      }
    }

    res.json(results);

  } catch (error) {
    console.error('❌ Expiry check error:', error);
    res.status(500).json({ error: 'Failed to check lock expiry' });
  }
});

/**
 * GET /admin/activity-log - Get detailed activity log with filtering - Admin only
 * Query params: type (send|lock|unlock|quota), email, limit (default 50)
 */
app.get('/admin/activity-log', checkAdmin, async (req, res) => {
  try {
    const { type, email, limit = 50 } = req.query;

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database temporarily unavailable' });
    }

    let query = {};
    if (email) {
      query.email = new RegExp(email, 'i');
    }

    const accounts = await Account.find(query).select({
      email: 1,
      sendingActivity: 1,
      adminAuditLog: 1,
      lock: 1
    });

    const activities = [];

    accounts.forEach(account => {
      // Add sending activities
      if (!type || type === 'send') {
        (account.sendingActivity || []).forEach(activity => {
          activities.push({
            type: 'send',
            email: account.email,
            timestamp: activity.timestamp,
            recipient: activity.recipientEmail,
            subject: activity.subject,
            status: activity.status,
            error: activity.errorMessage,
            totalRecipients: activity.totalRecipients
          });
        });
      }

      // Add admin audit log
      if (!type || type === 'admin') {
        (account.adminAuditLog || []).forEach(audit => {
          activities.push({
            type: 'admin',
            email: account.email,
            timestamp: audit.timestamp,
            action: audit.action,
            admin: audit.admin,
            details: audit.details,
            status: audit.status
          });
        });
      }

      // Add lock history
      if (!type || type === 'lock') {
        if (account.lock?.isLocked) {
          activities.push({
            type: 'lock',
            email: account.email,
            timestamp: account.lock.timestamp,
            action: 'locked',
            reason: account.lock.reason,
            actor: account.lock.actor,
            expiry: account.lock.expiry
          });
        }

        (account.lock?.unlockHistory || []).forEach(unlock => {
          activities.push({
            type: 'unlock',
            email: account.email,
            timestamp: unlock.unlockedAt,
            action: 'unlocked',
            reason: unlock.reason,
            actor: unlock.unlockedBy
          });
        });
      }
    });

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply limit
    const limitedActivities = activities.slice(0, parseInt(limit));

    res.json({
      total: activities.length,
      returned: limitedActivities.length,
      activities: limitedActivities
    });

  } catch (error) {
    console.error('❌ Activity log fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
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
