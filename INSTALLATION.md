# 🚀 INSTALLATION GUIDE - BPS Assessment System

> **Panduan Instalasi Lengkap untuk Mentor/Developer**  
> Estimasi waktu: **15-30 menit**

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Download & Setup](#download--setup)
3. [Database Configuration](#database-configuration)
4. [Backend Installation](#backend-installation)
5. [Frontend Installation](#frontend-installation)
6. [Running the Application](#running-the-application)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## 🛠️ Prerequisites

### Required Software
Pastikan sudah terinstall software berikut:

| Software | Version | Download Link | Verification Command |
|----------|---------|---------------|---------------------|
| **Node.js** | v16+ (Recommended: v18 LTS) | [nodejs.org](https://nodejs.org/) | `node --version` |
| **npm** | v8+ (comes with Node.js) | Included with Node.js | `npm --version` |
| **PostgreSQL** | v12+ | [postgresql.org](https://postgresql.org/) | `psql --version` |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) | `git --version` |

### Quick Verification
```bash
# Check all prerequisites
node --version    # Should show v16+ (e.g., v18.17.0)
npm --version     # Should show v8+ (e.g., v9.6.7)
psql --version    # Should show v12+ (e.g., v14.9)
git --version     # Should show any recent version
```

### 🖥️ OS Specific Installation

#### Windows
```bash
# Install using Chocolatey (optional)
choco install nodejs postgresql git

# Or download installers manually from official websites
```

#### macOS
```bash
# Install using Homebrew
brew install node postgresql git
brew services start postgresql
```

#### Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Git
sudo apt install git
```

---

## 📥 Download & Setup

### 1. Clone Repository
```bash
# Navigate to your desired directory
cd ~/Documents/Projects  # or wherever you want

# Clone the repository
git clone https://github.com/yourusername/bps-assessment-system.git

# Enter project directory
cd bps-assessment-system

# Verify structure
ls -la
# Should see: backend/ frontend/ README.md
```

### 2. Project Structure Overview
```
bps-assessment-system/
├── 📁 backend/                 # Node.js + Express API
│   ├── 📄 package.json        # Backend dependencies
│   ├── 📄 package-lock.json   # Locked versions
│   ├── 📁 src/                # Source code
│   ├── 📁 prisma/             # Database schema
│   └── 📄 .env                # Environment variables (create this)
├── 📁 frontend/               # React.js application  
│   ├── 📄 package.json        # Frontend dependencies
│   ├── 📄 package-lock.json   # Locked versions
│   └── 📁 src/                # React source code
└── 📄 README.md               # Documentation
```

---

## 🗄️ Database Configuration

### 1. Start PostgreSQL Service

#### Windows
```bash
# Start PostgreSQL service
net start postgresql-x64-14  # Version may vary

# Or use pgAdmin to start
```

#### macOS
```bash
# Start PostgreSQL
brew services start postgresql

# Check if running
brew services list | grep postgresql
```

#### Linux
```bash
# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Auto-start on boot

# Check status
sudo systemctl status postgresql
```

### 2. Create Database and User

#### Option A: Using psql (Command Line)
```bash
# Login to PostgreSQL as superuser
sudo -u postgres psql

# Create database
CREATE DATABASE bps_assessment;

# Create user with password
CREATE USER bps_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE bps_assessment TO bps_user;

# Grant schema permissions
\c bps_assessment
GRANT ALL ON SCHEMA public TO bps_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bps_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bps_user;

# Exit PostgreSQL
\q
```

#### Option B: Using pgAdmin (GUI)
1. Open pgAdmin
2. Connect to PostgreSQL server
3. Right-click "Databases" → Create → Database
4. Name: `bps_assessment`
5. Right-click "Login/Group Roles" → Create → Login/Group Role
6. Name: `bps_user`, Password: `your_secure_password`
7. Grant privileges to the user

### 3. Test Database Connection
```bash
# Test connection
psql -h localhost -U bps_user -d bps_assessment

# Should prompt for password, then show:
# bps_assessment=>

# Exit with \q
```

---

## ⚙️ Backend Installation

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Install Dependencies
```bash
# Install all dependencies (this may take 2-5 minutes)
npm install

# Verify installation
npm list --depth=0
```

#### Backend Dependencies Being Installed:
```json
{
  "@prisma/client": "^5.22.0",     # Database client
  "axios": "^1.10.0",              # HTTP client
  "bcrypt": "^6.0.0",              # Password hashing (alternative)
  "bcryptjs": "^2.4.3",            # Password hashing
  "cors": "^2.8.5",                # Cross-origin requests
  "dotenv": "^16.3.1",             # Environment variables
  "express": "^4.18.2",            # Web framework
  "form-data": "^4.0.3",           # Form data handling
  "helmet": "^7.1.0",              # Security headers
  "jsonwebtoken": "^9.0.2",        # JWT authentication
  "morgan": "^1.10.0",             # HTTP request logger
  "multer": "^2.0.1",              # File upload middleware
  "pdf-lib": "^1.17.1",            # PDF manipulation
  "pdfkit": "^0.17.1",             # PDF generation
  "puppeteer": "^24.13.0",         # Headless browser (for PDF)
  "sharp": "^0.34.3",              # Image processing
  "xlsx": "^0.18.5"                # Excel file processing
}
```

### 3. Setup Environment Variables
```bash
# Create .env file
touch .env

# Edit .env file (use nano, vim, or any text editor)
nano .env
```

**Copy this content to `.env`:**
```env
# Database Configuration
DATABASE_URL="postgresql://bps_user:your_secure_password@localhost:5432/bps_assessment"

# JWT Configuration
JWT_SECRET="bps-assessment-system-jwt-secret-key-2024-very-secure-min-32-chars"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=5000
NODE_ENV="development"

# CORS Configuration
FRONTEND_URL="http://localhost:3000"

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH="/uploads"

# Optional: Email Configuration (for future features)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER=""
EMAIL_PASS=""
```

**⚠️ Important:** Replace `your_secure_password` with the actual password you set for `bps_user`

### 4. Setup Database Schema
```bash
# Generate Prisma client
npm run db:generate

# Run database migrations (create tables)
npm run db:migrate

# Seed initial data (admin user, parameters, etc.)
npm run db:seed
```

### 5. Verify Backend Setup
```bash
# Start backend server
npm run dev

# Should see output like:
# 🚀 BPS Assessment System Backend Started!
# 📍 Port: 5000
# 🌍 Environment: development
# 🔗 Health check: http://localhost:5000/api/health
```

**Keep this terminal open!** Backend is now running.

---

## 🎨 Frontend Installation

### 1. Open New Terminal
Open a **new terminal window/tab** (keep backend running in the first one)

### 2. Navigate to Frontend Directory
```bash
cd bps-assessment-system/frontend
```

### 3. Install Dependencies
```bash
# Install all dependencies (this may take 2-5 minutes)
npm install

# Verify installation
npm list --depth=0
```

#### Frontend Dependencies Being Installed:
```json
{
  "@fortawesome/fontawesome-free": "^6.7.2",  # Icons
  "@testing-library/dom": "^10.4.0",          # Testing utilities
  "@testing-library/jest-dom": "^6.6.3",      # Jest matchers
  "@testing-library/react": "^16.3.0",        # React testing
  "@testing-library/user-event": "^13.5.0",   # User interaction testing
  "axios": "^1.10.0",                         # HTTP client
  "bootstrap": "^5.3.0",                      # CSS framework
  "react": "^19.1.0",                         # React framework
  "react-bootstrap": "^2.10.10",              # React Bootstrap components
  "react-dom": "^19.1.0",                     # React DOM
  "react-router-dom": "^7.6.3",               # Routing
  "react-scripts": "5.0.1",                   # Build tools
  "react-select": "^5.10.1",                  # Advanced select components
  "sass": "^1.89.2",                          # SASS preprocessor
  "web-vitals": "^2.1.4",                     # Performance metrics
  "xlsx": "^0.18.5"                           # Excel processing (client-side)
}
```

### 4. Start Frontend Development Server
```bash
# Start frontend server
npm start

# Should automatically open browser to http://localhost:3000
# If not, manually open: http://localhost:3000
```

---

## 🚀 Running the Application

### Terminal Setup
You should now have **2 terminals running**:

#### Terminal 1 - Backend
```bash
cd bps-assessment-system/backend
npm run dev
# Output: 🚀 BPS Assessment System Backend Started! Port: 5000
```

#### Terminal 2 - Frontend  
```bash
cd bps-assessment-system/frontend
npm start
# Output: Compiled successfully! Local: http://localhost:3000
```

### Application URLs
- **Frontend (React)**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health
- **Prisma Studio** (optional): Run `npm run db:studio` in backend folder

---

## ✅ Verification

### 1. Test Backend API
```bash
# Test API health endpoint
curl http://localhost:5000/api/health

# Should return:
# {"status":"OK","message":"BPS Assessment API is running",...}
```

### 2. Test Frontend Access
1. Open browser to http://localhost:3000
2. Should see BPS Assessment System login page
3. No console errors in browser Developer Tools

### 3. Test Database Connection
```bash
# In backend directory
npm run db:studio

# Should open Prisma Studio at http://localhost:5555
# You should see tables: User, Period, EvaluationParameter, etc.
```

### 4. Test Login (Default Admin Account)
After running `npm run db:seed`, try logging in with:
- **Username**: `admin`
- **Password**: `admin123`

(Check your `prisma/seed.js` file for exact credentials)

### 5. Test File Upload Directory
```bash
# Check if upload directories exist
ls -la backend/uploads/
# Should see: profiles/ temp/ directories
```

---

## 🐛 Troubleshooting

### ❌ Common Issues & Solutions

#### 1. **"Port 3000/5000 already in use"**
```bash
# Kill processes using the ports
# macOS/Linux:
lsof -ti:3000 | xargs kill -9
lsof -ti:5000 | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

#### 2. **"Database connection failed"**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS

# Test manual connection
psql -h localhost -U bps_user -d bps_assessment

# Reset database if needed
cd backend
npm run db:reset
npm run db:seed
```

#### 3. **"Prisma Client not generated"**
```bash
cd backend
npm run db:generate
npm run dev
```

#### 4. **"Permission denied for uploads folder"**
```bash
# Fix upload directory permissions
chmod 755 backend/uploads
mkdir -p backend/uploads/profiles
mkdir -p backend/uploads/temp
```

#### 5. **"npm install fails"**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Try using yarn instead
npm install -g yarn
yarn install
```

#### 6. **"Module not found" errors**
```bash
# Ensure you're in the correct directory
pwd  # Should show .../backend or .../frontend

# Reinstall dependencies
rm -rf node_modules
npm install
```

#### 7. **"JWT Secret too short" error**
```bash
# Edit backend/.env
# Make sure JWT_SECRET is at least 32 characters long
JWT_SECRET="bps-assessment-system-jwt-secret-key-2024-very-secure-min-32-chars"
```

### 🔧 Quick Diagnostic Commands

```bash
# Check Node.js and npm versions
node --version && npm --version

# Check if ports are available
netstat -tulpn | grep :3000
netstat -tulpn | grep :5000

# Check PostgreSQL status
pg_isready -h localhost -p 5432

# Check backend logs
cd backend && npm run dev

# Check frontend logs  
cd frontend && npm start

# Check database tables
cd backend && npm run db:studio
```

---

## 📞 Need Help?

### If you encounter issues:

1. **Check this troubleshooting section first**
2. **Verify all prerequisites are installed correctly**
3. **Ensure database is running and accessible**
4. **Check both terminal outputs for error messages**
5. **Try the diagnostic commands above**

### Contact Information
- **Project Repository**: [GitHub Issues](https://github.com/yourusername/bps-assessment-system/issues)
- **Developer**: [Your Contact Information]

---

## 🎉 Success! 

If everything is working correctly, you should have:

✅ Backend API running on http://localhost:5000  
✅ Frontend React app running on http://localhost:3000  
✅ PostgreSQL database connected and seeded  
✅ Login page accessible  
✅ Admin account working  
✅ File upload directories created  

**Next Steps:**
- Explore the admin dashboard
- Test the evaluation system
- Review the codebase
- Check the main README.md for detailed features

---

<div align="center">

**🏢 BPS Assessment System - Installation Complete!**

*Ready for development and testing*

</div>