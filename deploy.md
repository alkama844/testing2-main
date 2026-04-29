# MailPro Nafij - Vercel Deployment Guide

## Overview

This guide provides complete deployment instructions for MailPro Nafij on Vercel, including environment setup, domain configuration, database migration, and monitoring procedures.

**Project Type**: Node.js/Express Backend + Static Frontend
**Primary Domain**: mailpro.nafij.me
**Alternate Domains**: mailpro.nafijrahaman.me, mailpro.vercel.app
**Database**: MongoDB Atlas
**Runtime**: Node.js 18+

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables Setup](#environment-variables-setup)
3. [MongoDB Atlas Configuration](#mongodb-atlas-configuration)
4. [Google OAuth Setup](#google-oauth-setup)
5. [Database Migration](#database-migration)
6. [Vercel Configuration](#vercel-configuration)
7. [Deployment Steps](#deployment-steps)
8. [Domain Configuration](#domain-configuration)
9. [Environment Variables on Vercel](#environment-variables-on-vercel)
10. [Post-Deployment Verification](#post-deployment-verification)
11. [Monitoring and Logs](#monitoring-and-logs)
12. [Troubleshooting](#troubleshooting)
13. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Software

- **Node.js**: Version 18.0.0 or higher
  - Check: `node --version`
  - Install from: https://nodejs.org/

- **npm**: Version 8.0.0 or higher (included with Node.js)
  - Check: `npm --version`

- **Git**: Version 2.0 or higher
  - Check: `git --version`
  - Install from: https://git-scm.com/

- **Vercel CLI**: Latest version
  ```bash
  npm install -g vercel
  ```

### Required Accounts

- Vercel account: https://vercel.com/signup
- MongoDB Atlas account: https://www.mongodb.com/cloud/atlas/register
- Google Cloud Console account: https://console.cloud.google.com/

### Required Permissions

- GitHub repository push access (for deployment)
- Vercel project owner or admin role
- MongoDB Atlas project owner or admin role
- Google Cloud Console project admin access

---

## Environment Variables Setup

### Complete List of Required Environment Variables

All environment variables must be configured before deployment.

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `abc123def456.apps.googleusercontent.com` | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-xxxxxxxxxxxx` | Yes |
| `OAUTH_CALLBACK_URL` | OAuth callback URL for Vercel | `https://mailpro.nafij.me/auth/google/callback` | Yes |
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/mail-service?retryWrites=true&w=majority` | Yes |
| `SESSION_KEYS` | Session encryption keys (comma-separated for rotation) | `key1,key2,key3` | Yes |
| `ADMIN_PASSWORD` | Secure admin login password | `SecurePassword123!@#` | Yes |
| `PORT` | Server port (Vercel uses 3000) | `3000` | No (defaults to 3000) |
| `NODE_ENV` | Environment mode | `production` | Yes |
| `CANONICAL_DOMAIN` | Primary SEO domain | `mailpro.nafij.me` | Yes |
| `SERVICE_NAME` | Service branding name | `Mail Service` | Yes |
| `SUPPORT_EMAIL` | Support contact email | `support@nafijrahaman.me` | Yes |
| `HOSTING_CREDIT` | Hosting credit attribution | `nafijrahaman.me` | Yes |

### Local Development Setup

1. Create `.env` file in project root:
```bash
cp env.example .env
```

2. Edit `.env` with your actual values:
```
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
OAUTH_CALLBACK_URL=https://mailpro.nafij.me/auth/google/callback
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/mail-service?retryWrites=true&w=majority
SESSION_KEYS=production-key-1,production-key-2,production-key-3
ADMIN_PASSWORD=your_very_secure_admin_password_here
PORT=3000
NODE_ENV=production
CANONICAL_DOMAIN=mailpro.nafij.me
SERVICE_NAME=Mail Service
SUPPORT_EMAIL=support@nafijrahaman.me
HOSTING_CREDIT=nafijrahaman.me
```

### Security Notes

- **NEVER** commit `.env` file to repository
- Generate strong `SESSION_KEYS` using cryptographic random generator
- Admin password should be at least 16 characters with mixed case, numbers, symbols
- Store credentials securely in password manager
- Rotate keys periodically (add new keys to SESSION_KEYS for rotation)

---

## MongoDB Atlas Configuration

### Step 1: Create MongoDB Atlas Project

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign in or create account
3. Click "Create Project"
4. Enter project name: `MailPro Nafij`
5. Select organization (or create new)
6. Click "Create Project"

### Step 2: Create Cluster

1. Click "Create Deployment"
2. Choose "M0 (Free)" tier for development/testing
3. Select "AWS" as provider
4. Select appropriate region (closest to users)
5. Cluster name: `mail-service`
6. Click "Create Deployment"
7. Wait 5-10 minutes for cluster creation

### Step 3: Setup Database User

1. Go to "Database Access" in left menu
2. Click "Add Database User"
3. Choose "Password" authentication method
4. Username: `mailpro_user`
5. Generate strong password (copy to secure location)
6. Database User Privileges: "Built-in role: Atlas admin" (for initial setup)
7. Click "Add User"

### Step 4: Configure Network Access

1. Go to "Network Access" in left menu
2. Click "Add IP Address"
3. For development: Add your IP address
4. For production (Vercel): Click "Allow access from anywhere"
   - Enter `0.0.0.0/0` (allows all IPs - required for Vercel)
5. Click "Confirm"
6. **Important**: Add description "Vercel deployment" to remember why

### Step 5: Get Connection String

1. Go to Deployments > Databases
2. Click "Connect" on your cluster
3. Select "Drivers" (not "Compass" or "MongoDB Shell")
4. Choose "Node.js"
5. Select driver version 5.0 or higher
6. Copy connection string
7. Replace `<username>` and `<password>` with your database user credentials
8. Replace `<dbname>` with `mail-service`

**Final MongoDB URI format**:
```
mongodb+srv://mailpro_user:your_password@mail-service.xxxxx.mongodb.net/mail-service?retryWrites=true&w=majority&appName=mail-service
```

### Step 6: Create Application Database

1. In MongoDB Atlas, go to "Database"
2. Click on your cluster
3. Click "Collections"
4. Click "Create Database"
5. Database name: `mail-service`
6. Collection name: `accounts`
7. Click "Create"

**Indexes will be created automatically** by Mongoose on first application startup.

---

## Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Sign in with Google account
3. Click project selector at top
4. Click "NEW PROJECT"
5. Project name: `MailPro Nafij`
6. Organization: (select if applicable)
7. Click "CREATE"
8. Wait for project creation (about 1 minute)

### Step 2: Enable Gmail API

1. In left sidebar, click "APIs & Services" > "Library"
2. Search for "Gmail API"
3. Click "Gmail API"
4. Click "ENABLE"
5. Wait for API to be enabled

### Step 3: Create OAuth 2.0 Credentials

1. Click "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"
4. Name: `MailPro Nafij Web Client`
5. Authorized JavaScript origins:
   ```
   https://mailpro.nafij.me
   https://mailpro.nafijrahaman.me
   https://mailpro.vercel.app
   http://localhost:3000 (for local development)
   ```
6. Authorized redirect URIs:
   ```
   https://mailpro.nafij.me/auth/google/callback
   https://mailpro.nafijrahaman.me/auth/google/callback
   https://mailpro.vercel.app/auth/google/callback
   http://localhost:3000/auth/google/callback (for local development)
   ```
7. Click "CREATE"
8. Copy Client ID and Client Secret to secure location
9. Click "OK"

### Step 4: Configure OAuth Consent Screen

1. Click "APIs & Services" > "OAuth consent screen"
2. Select "External" (unless you have Google Workspace)
3. Click "CREATE"
4. Fill in required fields:
   - **App name**: `MailPro Nafij`
   - **User support email**: `support@nafijrahaman.me`
   - **App logo**: (optional - use favicon)
   - **Developer contact**: `support@nafijrahaman.me`
5. Scroll down and click "SAVE AND CONTINUE"
6. Click "ADD OR REMOVE SCOPES"
7. Add required scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
8. Click "UPDATE"
9. Click "SAVE AND CONTINUE"
10. Add test users (if not production):
    - Add your email to test access
11. Click "SAVE AND CONTINUE"

### Step 5: Verify Credentials

Ensure these OAuth scopes are correctly configured:

| Scope | Purpose | Required |
|-------|---------|----------|
| `gmail.readonly` | Read emails and metadata | Yes |
| `gmail.send` | Send emails on behalf of user | Yes |
| `userinfo.email` | Access user email address | Yes |
| `userinfo.profile` | Access user profile information | Yes |

---

## Database Migration

### Pre-Deployment Database Setup

#### Step 1: Verify MongoDB Connection

Test local connection:
```bash
# Install MongoDB CLI if needed
npm install -g mongodb-cli

# Test connection (requires MongoDB URI)
mongosh "your-connection-string"
```

#### Step 2: Create Database Indexes

The application automatically creates indexes on first run. However, you can pre-create them manually:

```bash
# Using MongoDB Atlas UI:
# 1. Go to your cluster
# 2. Click Collections
# 3. Select accounts collection
# 4. Click Indexes
# 5. Verify these indexes exist:
```

Required indexes (auto-created by Mongoose):
```javascript
// Email index for uniqueness
{ email: 1 } (unique)

// Lock status index for admin queries
{ 'lock.isLocked': 1 }

// Lock timestamp index for sorting
{ 'lock.timestamp': -1 }

// Account creation date index
{ createdAt: -1 }

// Sending activity timestamp index
{ 'sendingActivity.timestamp': -1 }
```

#### Step 3: Account Schema Validation

The Account model includes:
- **Lock metadata**: reason, actor, timestamp, expiry, unlock history
- **Sending activity**: tracking of all sent emails
- **Premium status**: backward-compatible with isPremium flag
- **Session tracking**: lastAccessed timestamp

All fields are pre-configured in `models/Account.js`.

#### Step 4: Pre-Migration Checklist

- [ ] MongoDB Atlas cluster is running
- [ ] Database user created with correct permissions
- [ ] Network whitelist includes 0.0.0.0/0 (for Vercel)
- [ ] `mail-service` database created
- [ ] Connection string is accessible from your local machine
- [ ] Connection string will be accessible from Vercel IPs

---

## Vercel Configuration

### Step 1: Create vercel.json

In project root, create `vercel.json`:

```json
{
  "version": 2,
  "env": [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "OAUTH_CALLBACK_URL",
    "MONGO_URI",
    "SESSION_KEYS",
    "ADMIN_PASSWORD",
    "NODE_ENV",
    "CANONICAL_DOMAIN",
    "SERVICE_NAME",
    "SUPPORT_EMAIL",
    "HOSTING_CREDIT"
  ],
  "buildCommand": "npm ci",
  "devCommand": "npm run dev",
  "functions": {
    "server.js": {
      "runtime": "nodejs18.x",
      "maxDuration": 60
    }
  },
  "rewrites": [
    { "source": "/(.*)", "destination": "/server.js" }
  ]
}
```

### Step 2: Update package.json

Ensure `package.json` has correct Node.js version specified:

```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Step 3: Ensure .env.local is in .gitignore

Verify `.gitignore` includes:
```
.env
.env.local
.env.*.local
node_modules/
.vercel/
```

---

## Deployment Steps

### Step 1: Prepare Local Repository

```bash
# Navigate to project directory
cd /workspaces/testing

# Ensure clean git state
git status

# If dirty, commit changes
git add .
git commit -m "Pre-deployment configuration"

# Ensure remote is set
git remote -v

# If no remote, add it
# git remote add origin https://github.com/username/mailpro-nafij.git
```

### Step 2: Connect Vercel to GitHub

1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Click "Import Git Repository"
4. Authorize GitHub access if prompted
5. Select repository `testing` (or your repo name)
6. Click "Import"

### Step 3: Configure Environment Variables

1. In Vercel Project Settings: "Settings" > "Environment Variables"
2. Add each environment variable:
   - **GOOGLE_CLIENT_ID**: [your client ID]
   - **GOOGLE_CLIENT_SECRET**: [your client secret]
   - **OAUTH_CALLBACK_URL**: `https://mailpro.nafij.me/auth/google/callback`
   - **MONGO_URI**: [your MongoDB connection string]
   - **SESSION_KEYS**: [your session keys, comma-separated]
   - **ADMIN_PASSWORD**: [your secure password]
   - **NODE_ENV**: `production`
   - **CANONICAL_DOMAIN**: `mailpro.nafij.me`
   - **SERVICE_NAME**: `Mail Service`
   - **SUPPORT_EMAIL**: `support@nafijrahaman.me`
   - **HOSTING_CREDIT**: `nafijrahaman.me`

3. For each variable, select:
   - Production: ✓
   - Preview: ✓
   - Development: ✓

4. Click "Save"

### Step 4: Trigger Initial Deployment

```bash
# Using Vercel CLI
vercel deploy --prod

# Or via Git push (auto-triggers if connected)
git push origin main
```

Wait for deployment to complete. You should see:
- Build logs showing `npm ci` and application startup
- Deployment URL generated (format: `mailpro-nafij-xxxxx.vercel.app`)

### Step 5: Verify Initial Deployment

```bash
# Test the Vercel deployment URL
curl https://mailpro-nafij-xxxxx.vercel.app/

# Should return HTML homepage
```

---

## Domain Configuration

### Step 1: Add Custom Domains in Vercel

1. In Vercel Project Settings: "Domains"
2. Click "Add"
3. Enter domain: `mailpro.nafij.me`
4. Select option to add domain
5. Vercel will show DNS records needed

### Step 2: Configure DNS

DNS configuration depends on your domain registrar:

#### For Domain Registrar (Namecheap, GoDaddy, etc.):

1. Log into domain registrar
2. Go to DNS settings for `nafij.me` or `mailpro.nafij.me`
3. Add CNAME record:
   - **Name**: `mailpro` (or `@` if setting up root domain)
   - **Type**: CNAME
   - **Target**: `cname.vercel-dns.com.`
4. Add verification TXT record (provided by Vercel)
5. Save changes

#### For DNS Provider (Cloudflare, etc.):

1. Add CNAME record:
   - **Type**: CNAME
   - **Name**: `mailpro.nafij.me`
   - **Target**: `cname.vercel-dns.com`
   - **TTL**: Automatic
   - **Proxy**: DNS only
2. Add TXT record for verification
3. Save changes

Wait 24-48 hours for DNS propagation (check with `nslookup mailpro.nafij.me`).

### Step 3: Add Alternate Domains

Repeat the above process for:
- `mailpro.nafijrahaman.me`
- Configure as alias (optional) or separate domain in Vercel

### Step 4: Configure SSL/HTTPS

Vercel automatically:
- Issues free SSL certificate for each domain
- Redirects HTTP to HTTPS
- Renews certificates before expiry

No manual action needed.

### Step 5: Update OAuth Redirect URL

If using Vercel's temporary URL during setup, update OAuth redirect URL once primary domain is live:

1. Google Cloud Console > "APIs & Services" > "Credentials"
2. Edit the OAuth client
3. Update "Authorized redirect URIs" to use final domain
4. Save

---

## Environment Variables on Vercel

### Accessing Environment Variables

1. **Via Vercel Dashboard**:
   - Project Settings > Environment Variables
   - Shows all variables (secrets masked with *)

2. **Via Vercel CLI**:
   ```bash
   vercel env list
   vercel env pull  # Download to .env.local for local testing
   ```

### Updating Variables

To update environment variables:

```bash
# Via CLI
vercel env add VARIABLE_NAME
# Enter value and select environments

# Or manually in Dashboard
# Settings > Environment Variables > Edit
```

After changing variables:
1. Deployment automatically triggers (or manually trigger redeploy)
2. Wait for new deployment to complete
3. Verify with API test

### Variable Rotation Strategy

For `SESSION_KEYS`:
1. Add new key to beginning: `new_key,old_key1,old_key2`
2. Deploy update
3. Wait 24 hours
4. Remove old key: `new_key`
5. Deploy final update

This allows sessions to transition gracefully.

---

## Post-Deployment Verification

### Checklist: Essential Verifications

#### 1. Environment Variables

- [ ] All 11 required variables configured
- [ ] No secrets in code or logs
- [ ] Variables match env.example structure
- [ ] Production/Preview/Development correctly set

#### 2. OAuth Configuration

- [ ] Redirect URL matches deployed domain
- [ ] OAuth scopes: `gmail.readonly`, `gmail.send`, `userinfo.email`, `userinfo.profile`
- [ ] All alternate domains added to authorized origins
- [ ] OAuth consent screen displays branding

#### 3. MongoDB Connection

```bash
# Test database connection from deployed function
curl https://mailpro.nafij.me/accounts -H "Cookie: isAdmin=true"

# Should receive response (not connection error)
```

- [ ] Database connection successful
- [ ] Can query accounts collection
- [ ] Indexes properly created

#### 4. API Endpoints

Test core endpoints:

```bash
# Home page
curl https://mailpro.nafij.me/ | grep -q "MailPro" && echo "✓ Home page OK"

# Privacy page
curl https://mailpro.nafij.me/privacy | grep -q "Privacy" && echo "✓ Privacy page OK"

# Terms page
curl https://mailpro.nafij.me/terms | grep -q "Terms" && echo "✓ Terms page OK"

# OAuth endpoint
curl -L https://mailpro.nafij.me/auth/google | grep -q "accounts.google.com" && echo "✓ OAuth redirect OK"

# Available accounts
curl https://mailpro.nafij.me/available-accounts | grep -q "[]" && echo "✓ Accounts endpoint OK"

# SEO assets
curl https://mailpro.nafij.me/robots.txt | grep -q "User-agent" && echo "✓ robots.txt OK"
curl https://mailpro.nafij.me/sitemap.xml | grep -q "urlset" && echo "✓ sitemap.xml OK"
```

#### 5. CORS Configuration

```bash
# Test CORS headers
curl -H "Origin: https://mailpro.nafij.me" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS https://mailpro.nafij.me/available-accounts -v

# Should see:
# access-control-allow-credentials: true
# access-control-allow-origin: *
```

- [ ] CORS headers present
- [ ] Credentials allowed
- [ ] Preflight requests successful

#### 6. Database Indexes

Via MongoDB Atlas:
1. Go to Collections > accounts
2. Click Indexes tab
3. Verify these exist:
   - `email_1` (unique)
   - `lock.isLocked_1`
   - `lock.timestamp_-1`
   - `createdAt_-1`
   - `sendingActivity.timestamp_-1`

- [ ] All required indexes exist
- [ ] Email index is unique
- [ ] Indexes improve query performance

#### 7. SEO Assets

- [ ] `robots.txt` returns proper directives
- [ ] `sitemap.xml` lists all pages
- [ ] `sitemap.xml` references primary domain
- [ ] `canonical` meta tag on all pages points to primary domain

#### 8. Static Assets

```bash
# Test public folder access
curl https://mailpro.nafij.me/style.css | grep -q "claymorphism" && echo "✓ CSS OK"
curl https://mailpro.nafij.me/favicon/favicon.ico -o /dev/null && echo "✓ Favicon OK"
```

- [ ] CSS files loading
- [ ] Favicon accessible
- [ ] All public assets accessible

#### 9. Domain Functionality

- [ ] Primary domain `mailpro.nafij.me` working
- [ ] Alt domain `mailpro.nafijrahaman.me` resolving
- [ ] Alt domain `mailpro.vercel.app` working
- [ ] HTTPS active on all domains
- [ ] HTTP redirects to HTTPS

#### 10. Error Handling

```bash
# Test 404 handling
curl https://mailpro.nafij.me/nonexistent-page

# Test 500 error handling
curl https://mailpro.nafij.me/email/invalid/fake-id
```

- [ ] 404 errors handled gracefully
- [ ] 500 errors logged and documented
- [ ] No stack traces exposed in responses

---

## Monitoring and Logs

### Access Logs

#### Via Vercel Dashboard

1. Project > Deployments
2. Select current deployment
3. Click "View Build Logs"
4. Tabs available:
   - Build: Startup logs
   - Runtime: Application execution logs
   - Function: Individual function invocations

#### Via Vercel CLI

```bash
# Stream logs in real-time
vercel logs --follow

# View logs for specific deployment
vercel logs --since 1h

# View specific function logs
vercel logs --follow server.js
```

### Setting Up Log Alerts

1. Go to Project Settings > Alerts
2. Click "Create Alert"
3. Select metric (e.g., Error Rate)
4. Set threshold
5. Choose notification method (email, Slack, etc.)

### Performance Monitoring

#### Metrics to Track

- **Response Time**: Should be <500ms for home page
- **Error Rate**: Should be <0.1%
- **Function Duration**: Most functions <2s, OAuth flow <5s
- **Cold Start Time**: <3s for initial request

#### Via Vercel Dashboard

1. Project > Analytics
2. View:
   - Edge Network: CDN performance
   - Response Time: Function performance
   - Status Codes: Error breakdown

#### Via External Tools

- **Sentry** (error tracking):
  ```javascript
  // Add to server.js (optional)
  const Sentry = require("@sentry/node");
  Sentry.init({ dsn: process.env.SENTRY_DSN });
  ```

- **Datadog** (comprehensive monitoring):
  - Sync metrics to Datadog
  - Set alerts for anomalies

### Log Retention

Vercel retains:
- Build logs: 30 days
- Runtime logs: 24 hours (deployable with premium)
- Error logs: Searchable via dashboard

To increase retention, upgrade to Vercel Pro/Enterprise.

---

## Troubleshooting

### Common Issues and Solutions

#### 1. OAuth Redirect URL Mismatch Error

**Error**: "Redirect URI mismatch" during OAuth

**Solution**:
```
1. Verify OAUTH_CALLBACK_URL environment variable
   - Must exactly match Google Cloud credential
   - Example: https://mailpro.nafij.me/auth/google/callback
2. Check Google Cloud Console > Credentials
3. Edit OAuth client
4. Verify "Authorized redirect URIs" contains your domain
5. Wait 5 minutes for changes to propagate
6. Clear browser cookies and try again
```

#### 2. MongoDB Connection Timeout

**Error**: "MongoServerError: connect ECONNREFUSED" or timeout

**Solution**:
```
1. Verify MONGO_URI is correct:
   - Check database name: mail-service
   - Check username/password has no special characters (or URL encoded)
2. In MongoDB Atlas:
   - Go to Network Access
   - Verify 0.0.0.0/0 is added (allows Vercel)
   - Wait 5 minutes for whitelist update
3. Test local connection first:
   - mongosh "your-connection-string"
4. Check MongoDB Atlas status: status.mongodb.com
5. Increase timeout in server.js:
   - serverSelectionTimeoutMS: 10000
   - socketTimeoutMS: 60000
```

#### 3. "Cannot find module" Error

**Error**: `Error: Cannot find module 'mongoose'` during deployment

**Solution**:
```
1. Verify package.json includes all dependencies:
   - mongoose
   - express
   - googleapis
   - cookie-session
   - cors
   - dotenv
2. Run locally to verify:
   - npm install
   - npm start
3. Check package-lock.json is committed
4. Clear Vercel cache:
   - Project Settings > Deployment Protection > Clear Cache
   - Redeploy
```

#### 4. Session/Cookie Issues

**Error**: "Cannot read property 'session' of undefined" or cookie errors

**Solution**:
```
1. Verify SESSION_KEYS environment variable:
   - Must contain at least one key
   - Format: "key1,key2,key3" (comma-separated)
   - Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
2. Check CORS configuration:
   - credentials: true must be set
   - origin: true allows all origins (adjust as needed)
3. Browser cookies blocked:
   - Clear browser cookies
   - Try incognito/private window
   - Check browser cookie settings
```

#### 5. Build Fails with "Heap Out of Memory"

**Error**: `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory`

**Solution**:
```
1. Add NODE_OPTIONS to vercel.json:
   {
     "build": {
       "env": {
         "NODE_OPTIONS": "--max-old-space-size=3008"
       }
     }
   }
2. Reduce dependencies if possible
3. Update to latest Node.js version
4. Split into multiple functions if needed
```

#### 6. Domain Not Resolving

**Error**: `ERR_NAME_NOT_RESOLVED` or domain shows "Page not found"

**Solution**:
```
1. Verify DNS records in domain registrar:
   - CNAME: mailpro -> cname.vercel-dns.com.
   - TXT: Verification record from Vercel
2. Check Vercel domain status:
   - Project Settings > Domains
   - Shows "Valid Configuration" when ready
3. Wait for DNS propagation:
   - Can take 24-48 hours
   - Check status: nslookup mailpro.nafij.me
4. If stuck:
   - Flush DNS cache
   - Try different DNS: 8.8.8.8, 1.1.1.1
5. For alternate domains:
   - Add as separate domains or aliases
   - Verify each domain's DNS separately
```

#### 7. HTTPS Certificate Not Issuing

**Error**: Site shows "Certificate not valid" or "NET::ERR_CERT_AUTHORITY_INVALID"

**Solution**:
```
1. Verify domain ownership:
   - Check Vercel > Domains > Shows valid DNS
   - May take 24-48 hours for verification
2. Redeploy to force certificate issuance:
   - vercel redeploy
3. Clear Vercel cache:
   - Project Settings > Deployment Protection > Clear Cache
4. If still failing:
   - Remove domain from Vercel
   - Wait 5 minutes
   - Re-add domain
   - Wait for certificate issuance
```

#### 8. Function Timeout (>60 seconds)

**Error**: "503 Service Unavailable" or "Function execution timeout"

**Solution**:
```
1. Check function execution time:
   - Logs should show duration
   - Typical functions: <2 seconds
2. For email operations:
   - Gmail API calls can be slow
   - May need to optimize queries
3. Increase timeout in vercel.json:
   {
     "functions": {
       "server.js": {
         "maxDuration": 900
       }
     }
   }
   (Max: 900 seconds for Pro, 60 for Free)
4. Optimize code:
   - Add indexes to database queries
   - Cache frequently accessed data
   - Implement request batching
5. Upgrade Vercel plan if needed for longer durations
```

#### 9. Admin Login Not Working

**Error**: Admin password rejected or login loop

**Solution**:
```
1. Verify ADMIN_PASSWORD environment variable:
   - Must be set in Vercel environment
   - Check Production environment selected
   - Clear browser cookies
   - Try incognito window
2. Check admin endpoint in server.js:
   - /admin/login uses POST method
   - Compares process.env.ADMIN_PASSWORD
3. Redeploy after password change:
   - vercel redeploy
4. For lost password:
   - Update ADMIN_PASSWORD in Vercel dashboard
   - Redeploy
   - Log in with new password
```

#### 10. Gmail OAuth Scope Errors

**Error**: "Error: (401) - Caller is not authorized to access this resource" or permission errors

**Solution**:
```
1. Verify OAuth scopes in server.js:
   - gmail.readonly
   - gmail.send
   - userinfo.email
   - userinfo.profile
2. Update Google consent screen:
   - Google Cloud Console > OAuth consent screen
   - Add scopes if missing
3. Add test user:
   - Google Console > OAuth consent screen
   - Add your email as test user
   - Wait 5 minutes
4. Re-authenticate:
   - Log out
   - Clear cookies
   - Try login again
5. For production launch:
   - Submit app for verification
   - Google will review scopes
```

---

## Rollback Procedures

### Quick Rollback to Previous Deployment

#### Via Vercel Dashboard

1. Project > Deployments
2. Find previous working deployment
3. Click three dots (•••)
4. Select "Promote to Production"
5. Confirm

Typically takes <1 minute to revert.

#### Via Vercel CLI

```bash
# List recent deployments
vercel deployments

# Promote specific deployment to production
vercel promote [DEPLOYMENT_ID]

# Example:
vercel promote dpl_abc123xyz
```

### Database Rollback (if data corruption)

#### MongoDB Point-in-Time Recovery

1. MongoDB Atlas > Backups
2. Check "Auto Backup" status
3. Click "Restore" on desired backup
4. Select target time
5. Confirm restoration (creates new database)
6. Update MONGO_URI to new database if desired

**Note**: Free tier doesn't have backups. Upgrade to M2+ for automatic backups.

#### Manual Backup Strategy

Before each major deployment:

```bash
# Export accounts collection
mongosh "your-connection-string" --eval "db.accounts.find().toArray()" > backup_$(date +%s).json

# Store in secure location (GitHub? AWS S3?)
```

### Code Rollback Strategy

#### Using Git Tags

```bash
# Tag current deployment before major changes
git tag -a v1.2.3 -m "Production deployment v1.2.3"
git push origin v1.2.3

# If rollback needed, reset to tag
git reset --hard v1.2.3
git push origin main --force
# This will trigger redeploy to previous version
```

### Monitoring Rollback Success

After rollback:

1. **Verify Endpoints**:
   ```bash
   curl https://mailpro.nafij.me/ | grep "MailPro"
   curl https://mailpro.nafij.me/available-accounts
   ```

2. **Check Logs**:
   ```bash
   vercel logs --follow
   ```

3. **Test OAuth**:
   - Full login flow
   - Verify Gmail API access

4. **Check Database**:
   - Query accounts collection
   - Verify data integrity

5. **Monitor Errors**:
   - Watch Vercel analytics
   - Verify error rate drops

---

## Verification Checklist: Pre-Launch

### Phase 1: Configuration Review

- [ ] **GitHub Repository**:
  - All files committed
  - `.env` in `.gitignore`
  - `.vercel/` in `.gitignore`
  - `vercel.json` present and configured

- [ ] **Environment Variables** (11 required):
  - [ ] GOOGLE_CLIENT_ID
  - [ ] GOOGLE_CLIENT_SECRET
  - [ ] OAUTH_CALLBACK_URL
  - [ ] MONGO_URI
  - [ ] SESSION_KEYS
  - [ ] ADMIN_PASSWORD
  - [ ] NODE_ENV
  - [ ] CANONICAL_DOMAIN
  - [ ] SERVICE_NAME
  - [ ] SUPPORT_EMAIL
  - [ ] HOSTING_CREDIT

- [ ] **Dependencies**:
  - package.json has Node.js >=18.0.0
  - All required packages listed
  - package-lock.json is current

### Phase 2: OAuth Configuration

- [ ] **Google Cloud Project Created**
  - Project name: MailPro Nafij
  - Gmail API enabled
  - OAuth consent screen configured

- [ ] **OAuth Credentials**:
  - Client ID and Secret generated
  - Authorized JavaScript origins include all domains
  - Authorized redirect URIs correct for all domains
  - Scopes: gmail.readonly, gmail.send, userinfo.email, userinfo.profile

- [ ] **Test Credentials**:
  - Client ID format: *.apps.googleusercontent.com
  - Client Secret format: GOCSPX-*
  - Both values stored securely

### Phase 3: MongoDB Configuration

- [ ] **MongoDB Atlas Setup**:
  - Cluster created (M0 free or higher)
  - Database user created
  - Database "mail-service" exists
  - Collection "accounts" exists

- [ ] **Network Access**:
  - IP whitelist includes 0.0.0.0/0
  - Connection string tested locally
  - Connection string uses retryWrites=true&w=majority

- [ ] **Database Indexes**:
  - Verified in MongoDB Atlas UI or via application startup
  - email index is unique
  - lock, createdAt, sendingActivity indexes present

- [ ] **Backup Strategy**:
  - Upgrade to M2+ for automatic backups (if not free)
  - Manual backup script created

### Phase 4: Domain Configuration

- [ ] **Primary Domain**:
  - mailpro.nafij.me registered and owned
  - DNS provider access available
  - Nameservers configured

- [ ] **Alternate Domains**:
  - mailpro.nafijrahaman.me accessible
  - mailpro.vercel.app reserved
  - All prepared for DNS setup

- [ ] **Vercel Domain Setup**:
  - Connected to GitHub account
  - Project imported
  - Domains added in Vercel dashboard

### Phase 5: Deployment

- [ ] **Initial Deployment**:
  - Vercel build succeeds
  - Deployment URL accessible
  - Environment variables loaded correctly

- [ ] **Domain Propagation**:
  - DNS records created
  - CNAME records pointing to Vercel
  - TXT verification record added
  - Wait for propagation (24-48 hours)

- [ ] **HTTPS Certificates**:
  - Vercel issues SSL certificates
  - Domains show as "Valid Configuration"
  - HTTPS accessible on all domains

### Phase 6: Functionality Verification

- [ ] **API Endpoints**:
  - GET / returns home page
  - GET /privacy works
  - GET /terms works
  - GET /available-accounts works
  - POST /admin/login accepts credentials

- [ ] **OAuth Flow**:
  - GET /auth/google redirects to Google
  - Callback URL correct
  - User data retrieved successfully

- [ ] **Database**:
  - Accounts can be saved
  - Queries execute within timeout
  - Connection is stable

- [ ] **SEO Assets**:
  - robots.txt accessible and correct
  - sitemap.xml returns valid XML
  - All pages have canonical meta tag
  - Open Graph tags present

### Phase 7: Security & Performance

- [ ] **Security**:
  - No hardcoded secrets in code
  - Environment variables used correctly
  - CORS properly configured
  - Admin password secured
  - SESSION_KEYS properly generated

- [ ] **Performance**:
  - Home page loads <2s
  - API responses <1s
  - Database queries optimized
  - No N+1 query problems

- [ ] **Monitoring**:
  - Error tracking configured
  - Logs accessible
  - Performance metrics visible
  - Alerts set up

### Phase 8: Documentation

- [ ] **README Updated**:
  - Deployment instructions included
  - Environment variables documented
  - Domain configuration noted

- [ ] **Runbook Created**:
  - Troubleshooting guide available
  - Common issues documented
  - Rollback procedures defined

- [ ] **Access Documented**:
  - Admin login credentials stored securely
  - MongoDB access details documented
  - Google Cloud project details documented

---

## Summary

This deployment guide covers:

1. **Prerequisites**: All required software and accounts
2. **Configuration**: Complete environment variable setup
3. **Infrastructure**: MongoDB Atlas, Google OAuth, Vercel setup
4. **Deployment**: Step-by-step instructions for Vercel deployment
5. **Verification**: Comprehensive checklist for post-deployment testing
6. **Monitoring**: Access logs, metrics, and alerts
7. **Troubleshooting**: Solutions for common issues
8. **Rollback**: Procedures for reverting to previous deployments

For questions or issues:
- Check troubleshooting section first
- Review Vercel documentation: https://vercel.com/docs
- Check MongoDB documentation: https://docs.mongodb.com/
- Contact support: support@nafijrahaman.me

---

## Appendix: Quick Reference

### Essential Commands

```bash
# Test locally
npm install
npm run dev

# Vercel CLI
npm install -g vercel
vercel login
vercel link
vercel env pull
vercel deploy --prod
vercel logs --follow

# Database
mongosh "connection-string"
db.accounts.find()
db.accounts.createIndex({ email: 1 })

# Git
git status
git add .
git commit -m "message"
git push origin main
```

### Key File Locations

- `/server.js` - Main Express app
- `/models/Account.js` - Database schema
- `/public/` - Frontend files
- `/env.example` - Environment variables template
- `/package.json` - Dependencies and scripts
- `/vercel.json` - Vercel deployment config

### Important URLs

- Vercel Dashboard: https://vercel.com/dashboard
- MongoDB Atlas: https://cloud.mongodb.com/
- Google Cloud Console: https://console.cloud.google.com/
- Domain Registrar: [your registrar]

---

**Last Updated**: April 25, 2026
**Version**: 1.0.0
**Status**: Production Ready
