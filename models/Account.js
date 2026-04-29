const mongoose = require('mongoose');

/**
 * MongoDB Schema for storing Gmail account information
 * - email: Gmail address of the connected account
 * - refreshToken: OAuth2 refresh token for API access
 * - isPremium: Boolean flag for premium account status (locked to owner/admin only)
 * - sendingActivity: Array tracking email sends for admin observability
 * - lastSentEmail: Timestamp of last send for rate-limiting
 * - sentEmailsCount: Daily send count for rate-limiting
 * - quotaConfig: Per-account send quotas and limits
 * - adminAuditLog: Full action history for admin operations
 */
const accountSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  lock: {
    isLocked: {
      type: Boolean,
      default: false
    },
    reason: {
      type: String,
      default: null
    },
    actor: {
      type: String,
      default: null
    },
    timestamp: {
      type: Date,
      default: null
    },
    expiry: {
      type: Date,
      default: null
    },
    unlockHistory: [{
      unlockedAt: {
        type: Date,
        default: Date.now
      },
      unlockedBy: {
        type: String,
        required: true
      },
      reason: {
        type: String,
        default: null
      }
    }]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  lastSentEmail: {
    type: Date,
    default: null
  },
  sendingActivity: [
    {
      timestamp: {
        type: Date,
        default: Date.now
      },
      recipientEmail: String,
      recipientName: String,
      subject: String,
      status: {
        type: String,
        enum: ['success', 'failed'],
        default: 'success'
      },
      errorMessage: String
    }
  ],
  quotaConfig: {
    dailyLimit: {
      type: Number,
      default: null // null = unlimited
    },
    monthlyLimit: {
      type: Number,
      default: null // null = unlimited
    },
    currentDayCount: {
      type: Number,
      default: 0
    },
    currentMonthCount: {
      type: Number,
      default: 0
    },
    lastDayReset: {
      type: Date,
      default: Date.now
    },
    lastMonthReset: {
      type: Date,
      default: Date.now
    }
  },
  adminAuditLog: [
    {
      timestamp: {
        type: Date,
        default: Date.now
      },
      action: {
        type: String,
        enum: [
          'account_locked',
          'account_unlocked',
          'quota_set',
          'quota_updated',
          'password_changed',
          'premium_status_changed',
          'bulk_operation',
          'login_attempt',
          'email_sent',
          'settings_updated'
        ],
        required: true
      },
      admin: {
        type: String, // admin email
        required: true
      },
      details: {
        type: String, // JSON or text description of what changed
        default: null
      },
      previousValue: {
        type: mongoose.Schema.Types.Mixed,
        default: null
      },
      newValue: {
        type: mongoose.Schema.Types.Mixed,
        default: null
      },
      status: {
        type: String,
        enum: ['success', 'failed'],
        default: 'success'
      }
    }
  ]
}, {
  timestamps: true
});

// Add indexes for better performance
accountSchema.index({ email: 1 });
accountSchema.index({ isPremium: 1 });
accountSchema.index({ 'lock.isLocked': 1 });
accountSchema.index({ 'lock.timestamp': -1 });
accountSchema.index({ createdAt: -1 });
accountSchema.index({ 'sendingActivity.timestamp': -1 });
accountSchema.index({ 'adminAuditLog.timestamp': -1 });
accountSchema.index({ 'adminAuditLog.action': 1 });
accountSchema.index({ 'adminAuditLog.admin': 1 });
accountSchema.index({ 'quotaConfig.dailyLimit': 1 });
module.exports = mongoose.model('Account', accountSchema);

