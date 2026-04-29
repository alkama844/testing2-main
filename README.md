# MailPro Nafij - Secure Gmail Account Access & Management

A production-ready Node.js + Express application providing secure temporary access to Gmail accounts with multi-account support, admin controls, and comprehensive SEO optimization.

## 🚀 Features

### Phase 0 - Standards Lock (COMPLETE)
- SEO-friendly naming conventions for classes, IDs, and aria-labels
- Primary canonical domain: mailpro.nafij.me
- Semantic HTML structure with proper ARIA labels
- UI quality gates with responsive breakpoints

### Phase 1 - SEO Everywhere System (COMPLETE)
- Complete page-level SEO metadata (title, description, canonical, robots, Open Graph, Twitter cards, JSON-LD schema)
- Semantic naming policy for all HTML identifiers
- Reusable SEO constants for brand keywords (mail nafij, mailpro nafij, mail nafijpro, nafijrahaman)
- Public robots.txt with crawl directives and sitemap reference
- Public sitemap.xml with priority and update frequency
- All public pages optimized: index, inbox, privacy, terms, author, credits

### Production Features
- **MailPro Nafij OAuth2**: Secure Gmail authentication with Google OAuth2
- **Multi-Account Support**: Connect and switch between multiple mail nafij accounts
- **Admin Dashboard**: Comprehensive management interface for account administration
- **Premium Account Control**: Lock/unlock accounts to restrict public access
- **MongoDB Integration**: Persistent account data storage
- **Production Ready**: Deployed on Render with environment configuration

## 🛠️ Technology Stack

- **Backend**: Node.js 18+, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Google OAuth2 (googleapis)
- **Session Management**: cookie-session
- **Security**: CORS enabled, secure session handling
- **SEO**: Semantic HTML5, JSON-LD schema, Open Graph, Twitter Card meta tags
- **Naming Convention**: MailPro Nafij brand-scoped semantic classes and identifiers

### SEO Keywords Integrated
- mail nafij
- mailpro nafij  
- mail nafijpro
- nafijrahaman
- gmail access
- secure email viewer
- oauth2 authentication
## 📋 Prerequisites

Before running this application, you need:

1. **Google Cloud Console Project**:
   - Create a project at [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Gmail API and Google+ API
   - Create OAuth2 credentials (Web application)
   - Add authorized redirect URI: `https://your-domain.com/auth/google/callback`

2. **MongoDB Database**:
   - Local MongoDB installation OR
   - MongoDB Atlas cloud database

## ⚙️ Environment Variables

Create a `.env` file for MailPro Nafij configuration:

```env
# MailPro Nafij - Google OAuth2 Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=https://mailpro.nafij.me/auth/google/callback

# MongoDB Connection for MailPro Nafij
MONGO_URI=mongodb://localhost:27017/mailpro-nafij

# MailPro Session Security
SESSION_SECRET=your_super_secret_session_key_here

# MailPro Nafij Admin Configuration
ADMIN_PASSWORD=your_secure_admin_password

# Server Configuration
PORT=3000
NODE_ENV=production

# Domain Configuration (Phase 0: Standards Lock)
PRIMARY_DOMAIN=mailpro.nafij.me
CANONICAL_URL=https://mailpro.nafij.me
```

## 🚀 Installation & Setup

1. **Clone and install dependencies**:
```bash
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env
# Edit .env with your actual values
```

3. **Run in development mode**:
```bash
npm run dev
```

4. **Run in production mode**:
```bash
npm start
```

## 📡 API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth flow for MailPro Nafij
- `GET /auth/google/callback` - Handle OAuth callback
- `GET /logout` - Clear user session

### Account Access
- `GET /inbox/:email` - Get inbox emails for mail nafij account
- `GET /email/:email/:messageId` - Get full email content from mail nafij
- `GET /available-accounts` - List accounts for MailPro Nafij selector

### Admin Only
- `POST /admin/login` - Authenticate as MailPro Nafij administrator
- `GET /accounts` - List all connected mail nafij accounts
- `POST /admin/lock/:email` - Restrict account access in MailPro Nafij
- `POST /admin/unlock/:email` - Allow public access to mail nafij account

## 🔒 Access Control

### Regular Users
- Can access their own MailPro Nafij Gmail accounts
- Can access non-premium (public) mail nafij accounts
- Cannot access premium accounts owned by others

### Admin Users (MailPro Nafij)
- Can access all non-premium accounts
- Can view all mail nafij accounts in admin dashboard
- Can lock/unlock accounts in MailPro system
- Cannot access premium accounts (unless unlocked first)

### Account Status
- **Public**: Accessible in MailPro Nafij by owner and any authenticated user
- **Premium**: Restricted to owner and admin in MailPro Nafij system

## 🏗️ Database Schema

```javascript
{
  email: String,        // Gmail address (unique, lowercase)
  refreshToken: String, // OAuth2 refresh token
  isPremium: Boolean,   // Premium status (default: false)
  createdAt: Date,      // Account creation timestamp
  lastAccessed: Date    // Last inbox access timestamp
}
```

## 🌐 Domain Strategy (Phase 0: Standards Lock)

### Primary Domain (Canonical)
- **mailpro.nafij.me** - Primary canonical domain for MailPro Nafij
- All SEO signals concentrated here
- Canonical meta tags point to this domain

### Alternate Working Domains (Fallback)
- mailpro.nafijrahaman.me - Alternate deployment location
- mailpro.vercel.app - Fallback Vercel deployment
- robots.txt and canonical tags prevent duplicate indexing

### Deployment Configuration
Ensure `CANONICAL_URL=https://mailpro.nafij.me` in all environment configurations to maintain SEO consistency across deployments.

## 🌐 Deployment on Render

1. **Push code to GitHub repository**

2. **Create new Web Service on Render**:
   - Connect your GitHub repository
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Configure Environment Variables** in Render dashboard:
   - Add all variables from `.env.example`
   - Set `CANONICAL_URL=https://mailpro.nafij.me`
   - Set `GOOGLE_REDIRECT_URI=https://mailpro.nafij.me/auth/google/callback`

4. **Update OAuth2 Settings**:
   - Add mailpro.nafij.me to Google Cloud Console authorized redirect URIs

## 📋 Completed Phases

### Phase 0 - Standards Lock (COMPLETE)
Standards, naming conventions, and domain strategy established:
- **Naming Standard**: `mailpro-` prefix for all classes, IDs, and semantic identifiers
- **SEO Keywords**: mail nafij, mailpro nafij, mail nafijpro, nafijrahaman
- **Primary Domain**: mailpro.nafij.me (canonical)
- **Alternate Domains**: mailpro.nafijrahaman.me, mailpro.vercel.app
- **HTML Structure**: Semantic HTML5 with ARIA labels for accessibility
- **UI Quality Gates**: Responsive breakpoints, keyboard navigation, focus visibility

### Phase 1 - SEO Everywhere System (COMPLETE)
Comprehensive SEO optimization across all public pages:
- **Meta Tags**: Title, description, canonical, robots, author on all pages
- **Open Graph**: og:title, og:description, og:image, og:site_name
- **Twitter Cards**: twitter:card, twitter:title, twitter:description, twitter:image
- **Schema Markup**: JSON-LD structured data for WebApplication and WebPage types
- **Semantic Naming**: All identifiers follow `mailpro-*` convention with semantic meaning
- **SEO Constants**: Reusable keyword strings and site name constants in JavaScript
- **Robots.txt**: Crawl directives with sitemap reference
- **Sitemap.xml**: URL map with priority and update frequency for search engines

### Next Phases
- **Phase 2**: UI/UX Redesign (Dark Claymorphism + Special Design)
- **Phase 3**: Inbox Reader Upgrade (Raw/HTML smart viewing)
- **Phase 4**: Admin System Enhancement (Lock metadata and auditability)
- **Phase 5**: New Pages (Author, Credits)
- **Phase 6**: Gmail Sending System
- **Phase 7**: QA, Security, Launch

### Project Structure
```
mailpro-nafij/
├── models/
│   └── Account.js              # MongoDB schema
├── public/
│   ├── index.html              # Homepage with SEO metadata
│   ├── inbox.html              # Email inbox viewer with semantic naming
│   ├── admin.html              # Admin dashboard with ARIA labels
│   ├── privacy.html            # Privacy policy with SEO structure
│   ├── terms.html              # Terms of service with SEO structure
│   ├── robots.txt              # Crawl directives (Phase 1)
│   ├── sitemap.xml             # URL sitemap for MailPro Nafij (Phase 1)
│   └── style.css               # Semantic CSS with mailpro- prefix
├── server.js                   # Main Express application
├── package.json                # Dependencies and scripts
├── .env.example                # Environment template
├── README.md                   # Documentation
└── plan.md                     # Development roadmap

### Scripts
- `npm start` - Production server
- `npm run dev` - Development server with nodemon
- `npm test` - Run tests (placeholder)

## 🛡️ Security Features

- **OAuth2 Secure Flow**: No password storage, Google handles authentication
- **Session Management**: Secure cookie-based sessions
- **Admin Protection**: Admin routes protected by email verification
- **CORS Enabled**: Cross-origin request support
- **Input Validation**: Email normalization and validation
- **Error Handling**: Comprehensive error handling and logging

## 📝 Usage Examples

### Connect Gmail Account
1. Visit `/auth/google`
2. Complete Google OAuth flow
3. Account automatically stored in database

### View Inbox
```bash
curl "https://your-domain.com/inbox/user@gmail.com" \
  -H "Cookie: session=your_session_cookie"
```

### Admin Operations
```bash
# Lock account (admin only)
curl -X POST "https://your-domain.com/admin/lock/user@gmail.com" \
  -H "Cookie: session=admin_session_cookie"

# Unlock account (admin only)  
curl -X POST "https://your-domain.com/admin/unlock/user@gmail.com" \
  -H "Cookie: session=admin_session_cookie"
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For issues and questions:
1. Check existing GitHub issues
2. Create a new issue with detailed description
3. Include environment details and error logs

---

**Built with ❤️ for secure Gmail account management**