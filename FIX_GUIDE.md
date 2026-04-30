# MailPro Nafij - Fix & Restore Guide

## Issues Fixed ✅

### 1. OAuth Redirect URI Mismatch ✅
**Problem:** `Error 400: redirect_uri_mismatch` when trying to sign in with Google

**Root Cause:** 
- The OAuth callback URL configuration didn't match the Render deployment URL
- `.env.prod` and `render.yaml` had mismatched URLs

**Solution Applied:**
- ✅ Updated `render.yaml` OAUTH_CALLBACK_URL: `https://mailpro-nafij.onrender.com/auth/google/callback`
- ✅ Updated `.env.prod` OAUTH_CALLBACK_URL: `https://mailpro-nafij.onrender.com/auth/google/callback`
- ✅ Updated `CANONICAL_URL` to: `https://mailpro-nafij.onrender.com`

**Next Steps for You:**
1. Push these changes to your Render deployment
2. Redeploy the application (Render will auto-deploy on git push)
3. Go to your [Google Cloud Console](https://console.cloud.google.com/)
4. Select your project → APIs & Services → Credentials
5. Click on your OAuth 2.0 Client ID
6. Add/Update Authorized redirect URIs:
   - Add: `https://mailpro-nafij.onrender.com/auth/google/callback`
7. Save and test the login again

---

### 2. Dropdown Selector Styling ✅
**Problem:** Filter dropdown selectors had white text on white background (invisible text)

**Solution Applied:**
- ✅ Added proper color styling for `.mailpro-filter-select` class
- ✅ Fixed select option colors with dark background and light text
- ✅ Added hover and focus states
- ✅ Set accent color for checked options

**Result:** Dropdown selectors now have:
- Dark background with light text (visible)
- Proper hover effects
- Focused states with accent color

---

## Remaining Task: Restore Inbox Data 📨

### Prerequisites
You need:
- MongoDB connection string for the **OLD server** (where your email data is stored)
- MongoDB connection string for the **NEW server** (Render's MongoDB)

### How to Restore Email Data

#### Step 1: Get Your MongoDB URIs

**For Render's MongoDB:**
1. Go to https://dashboard.render.com
2. Select your project
3. Find "mailpro-mongodb" database
4. Copy the Internal Database URL (for migration script)
5. Also copy the External Database URL (for external connections)

**For Old Server:**
- Get the MongoDB connection string from your old server's configuration
- Example format: `mongodb+srv://username:password@cluster.mongodb.net/mailpro`

#### Step 2: Run the Migration Script

```bash
# Navigate to project directory
cd "c:\Users\M R Computer\Downloads\testing2-main\testing2-main"

# Run migration (replace with your actual MongoDB URIs)
node scripts/migrate-data.js \
  "mongodb+srv://old-username:old-password@old-cluster.mongodb.net/mailpro-old" \
  "mongodb+srv://new-username:new-password@render-cluster.mongodb.net/mailpro"
```

**Example:**
```bash
node scripts/migrate-data.js \
  "mongodb+srv://admin:SecurePass123@old-mail-cluster.mongodb.net/mailpro" \
  "mongodb+srv://admin:NewSecurePass456@mailpro-mongodb-render.mongodb.net/mailpro"
```

#### Step 3: Verify the Migration

After running the script:
1. Check the console output for success messages
2. Log in to your MailPro application
3. Go to the Inbox page
4. Select an account from the dropdown
5. Click "Refresh" button
6. You should see your restored emails

---

## Complete Deployment Checklist

- [ ] Push OAuth URL fixes to git
- [ ] Redeploy application on Render
- [ ] Update Google OAuth credentials with new redirect URI
- [ ] Test OAuth login flow
- [ ] Verify dropdown selectors display correctly
- [ ] Run migration script with correct MongoDB URIs
- [ ] Test email list displays in inbox
- [ ] Verify all emails are visible and filterable

---

## Troubleshooting

### OAuth Still Giving 400 Error?
1. Clear browser cache (Ctrl+Shift+Delete)
2. Verify Google OAuth credentials in Google Cloud Console
3. Wait 5-10 minutes for OAuth changes to propagate
4. Check Render deployment logs for errors

### Dropdown Still Shows White Text?
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Check that CSS file loaded correctly
4. Check browser console for CSS errors (F12)

### Migration Script Not Connecting?
1. Verify MongoDB URIs are correct
2. Check MongoDB is accessible from your machine
3. Verify network/firewall isn't blocking MongoDB port
4. Test connection with MongoDB Compass first

### No Emails Showing in Inbox?
1. Verify migration script completed successfully
2. Check that MongoDB has data: 
   ```bash
   node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(e => console.error(e))"
   ```
3. Check browser console for JavaScript errors (F12)
4. Verify you're connected with the correct Google account

---

## Environment Variables to Verify

Your Render environment should have:
```
NODE_ENV=production
OAUTH_CALLBACK_URL=https://mailpro-nafij.onrender.com/auth/google/callback
CANONICAL_URL=https://mailpro-nafij.onrender.com
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
MONGODB_URI=your-mongodb-uri
SESSION_KEYS=your-session-keys
ADMIN_PASSWORD=your-admin-password
```

---

## Files Modified

1. ✅ `render.yaml` - Updated OAuth callback URL and canonical URL
2. ✅ `.env.prod` - Updated OAuth callback URL and canonical URL  
3. ✅ `static/style.css` - Fixed dropdown selector styling
4. ✅ `scripts/migrate-data.js` - Created new migration script

---

## Need Help?

If you encounter issues:
1. Check the deployment logs on Render
2. Open browser console (F12) for JavaScript errors
3. Verify all MongoDB URIs and credentials
4. Test each step individually
