# 🏢 BPS Assessment System - Kabupaten Pringsewu

> Sistem Penilaian Pegawai BPS Kabupaten Pringsewu yang komprehensif dengan fitur penilaian Tokoh BerAKHLAK, Presensi, dan CKP untuk menentukan **Best Employee of the Month**.

![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)
![React](https://img.shields.io/badge/React-v19.1.0-blue.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v12+-orange.svg)
![Prisma](https://img.shields.io/badge/Prisma-v5.22.0-purple.svg)

## 📋 Deskripsi

Sistem ini menggantikan penilaian berbasis Google Form dengan aplikasi web yang lebih robust dan terintegrasi. Sistem memiliki 3 aspek penilaian utama:

- **🎯 Tokoh BerAKHLAK (30%)** - 8 parameter perilaku dengan 3 kategori penilaian
- **⏰ Presensi (40%)** - Perhitungan kehadiran, keterlambatan, dan absensi
- **📊 CKP (30%)** - Capaian Kinerja Pegawai

## 🚀 Tech Stack

### Backend
- **Framework**: Express.js v4.18.2
- **Database**: PostgreSQL + Prisma ORM v5.22.0
- **Authentication**: JWT + bcrypt
- **File Processing**: Multer + XLSX + Sharp
- **PDF Generation**: PDFKit + Puppeteer
- **Security**: Helmet + CORS

### Frontend  
- **Framework**: React v19.1.0
- **Routing**: React Router DOM v7.6.3
- **UI Library**: React Bootstrap v2.10.10 + FontAwesome
- **HTTP Client**: Axios v1.10.0
- **Styling**: SASS + Bootstrap v5.3.0
- **Form Components**: React Select v5.10.1

## ⚡ Quick Start

### Prerequisites

Pastikan sudah terinstall:
```bash
# Node.js (Recommended: v18 atau v20)
node --version  # v16+

# PostgreSQL
psql --version  # v12+

# Git
git --version
```

### 🔽 1. Clone Repository

```bash
git clone https://github.com/harisskh/bps-assessment-system.git
cd bps-assessment-system
```

### 🗄️ 2. Setup Database

```sql
-- Login ke PostgreSQL
sudo -u postgres psql

-- Buat database dan user
CREATE DATABASE bps_assessment;
CREATE USER bps_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE bps_assessment TO bps_user;

-- Exit PostgreSQL
\q
```

### ⚙️ 3. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
```

**Edit file `.env`:**
```env
# Database Configuration
DATABASE_URL="postgresql://bps_user:your_password@localhost:5432/bps_assessment"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-min-32-characters"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=5000
NODE_ENV="development"

# CORS Configuration
FRONTEND_URL="http://localhost:3000"

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH="/uploads"

# Optional: Email Configuration (untuk reset password)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
```

```bash
# Generate Prisma client dan setup database
npm run db:generate
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

### 🎨 4. Setup Frontend

```bash
# Buka terminal baru
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

### 🌐 5. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Prisma Studio**: `npm run db:studio` (di folder backend)

## 📦 Dependencies Details

### Backend Dependencies (`backend/package.json`)

#### Core Framework
```json
{
  "express": "^4.18.2",           // Web framework
  "@prisma/client": "^5.22.0",    // Database client
  "prisma": "^5.7.0"              // Database toolkit
}
```

#### Authentication & Security
```json
{
  "jsonwebtoken": "^9.0.2",       // JWT tokens
  "bcryptjs": "^2.4.3",          // Password hashing
  "helmet": "^7.1.0",            // Security headers
  "cors": "^2.8.5"               // Cross-origin requests
}
```

#### File Processing
```json
{
  "multer": "^2.0.1",            // File upload
  "xlsx": "^0.18.5",             // Excel processing
  "sharp": "^0.34.3",            // Image processing
  "pdf-lib": "^1.17.1",          // PDF manipulation
  "pdfkit": "^0.17.1",           // PDF generation
  "puppeteer": "^24.13.0"        // PDF from HTML
}
```

#### Utilities
```json
{
  "dotenv": "^16.3.1",           // Environment variables
  "morgan": "^1.10.0",           // HTTP request logger
  "axios": "^1.10.0",            // HTTP client
  "form-data": "^4.0.3"          // Form data handling
}
```

### Frontend Dependencies (`frontend/package.json`)

#### Core Framework
```json
{
  "react": "^19.1.0",            // React framework
  "react-dom": "^19.1.0",        // React DOM
  "react-scripts": "5.0.1"       // Build tools
}
```

#### Routing & UI
```json
{
  "react-router-dom": "^7.6.3",  // Routing
  "react-bootstrap": "^2.10.10", // UI components
  "bootstrap": "^5.3.0",         // CSS framework
  "@fortawesome/fontawesome-free": "^6.7.2"  // Icons
}
```

#### Form & Data
```json
{
  "react-select": "^5.10.1",     // Advanced select components
  "axios": "^1.10.0",            // HTTP client
  "xlsx": "^0.18.5"              // Excel processing (client-side)
}
```

#### Testing & Development
```json
{
  "@testing-library/react": "^16.3.0",        // React testing
  "@testing-library/jest-dom": "^6.6.3",      // Jest matchers
  "@testing-library/user-event": "^13.5.0",   // User interactions
  "sass": "^1.89.2"                           // SASS preprocessor
}
```

## 🏗️ Project Structure

```
BPS-ASSESSMENT-SYSTEM/
├── 📁 backend/
│   ├── 📄 package.json              # Backend dependencies
│   ├── 📄 package-lock.json         # Locked versions
│   ├── 📁 src/
│   │   ├── 📄 app.js               # Main application file
│   │   ├── 📁 controllers/         # Business logic
│   │   ├── 📁 routes/              # API endpoints
│   │   ├── 📁 middleware/          # Custom middleware
│   │   └── 📁 utils/               # Helper functions
│   ├── 📁 prisma/
│   │   ├── 📄 schema.prisma        # Database schema
│   │   ├── 📄 seed.js              # Initial data
│   │   └── 📁 migrations/          # Database migrations
│   ├── 📁 uploads/                 # File uploads
│   ├── 📄 .env                     # Environment variables
│   └── 📄 .gitignore               # Git ignore rules
├── 📁 frontend/
│   ├── 📄 package.json              # Frontend dependencies
│   ├── 📄 package-lock.json         # Locked versions
│   ├── 📁 src/
│   │   ├── 📁 components/          # Reusable components
│   │   ├── 📁 pages/               # Page components
│   │   ├── 📁 services/            # API services
│   │   ├── 📁 hooks/               # Custom React hooks
│   │   ├── 📁 contexts/            # React contexts
│   │   └── 📁 styles/              # SCSS stylesheets
│   ├── 📁 public/                  # Static assets
│   ├── 📄 .gitignore               # Git ignore rules
│   └── 📄 README.md                # Frontend documentation
└── 📄 README.md                    # Main documentation
```

## 👥 User Roles & Features

### 1. 👤 **Staff User**
- ✅ Login dengan username
- ✅ Penilaian Tokoh BerAKHLAK (3 pegawai)
- ✅ Input nilai 8 parameter per pegawai
- ✅ View penjelasan sistem penilaian

### 2. 👨‍💼 **Admin**
- ✅ **CRUD Master Data Pegawai** + Import Excel
- ✅ **Kelola Periode Penilaian** (Tahun, Bulan, Status)
- ✅ **Input Presensi** (TK, PSW, TLT, APEL, CT)
- ✅ **Input CKP** (Capaian Kinerja Pegawai)
- ✅ **Kelola Parameter BerAKHLAK**
- ✅ **Proses Best Employee** dengan perhitungan otomatis
- ✅ **Export Reports** (Excel, PDF)

### 3. 👔 **Pimpinan**
- ✅ **Dashboard Analytics** dengan grafik
- ✅ **Monitoring Pengisian** (siapa yang belum mengisi)
- ✅ **Leaderboard Best Employee** per periode
- ✅ **View Data Pegawai** + grafik penilaian
- ✅ **Dapat menilai** seperti staff user
- ❌ Tidak bisa CRUD (view-only untuk data master)

## 🔄 Workflow Sistem

### 1. 📝 Penilaian Tokoh BerAKHLAK
```
User Login → Pilih Periode → Pilih 3 Pegawai → 
Isi 8 Parameter (per pegawai) → Submit → Terima Kasih
```

### 2. ⚙️ Perhitungan Otomatis
- **BerAKHLAK**: Rata-rata dari semua penilai per kategori
- **Presensi**: 100% - total pengurangan maksimal
- **CKP**: Input manual oleh admin

### 3. 🏆 Best Employee Selection
```
1. Kandidat = 2 peringkat teratas (berdasarkan jumlah pemilih)
2. Final Score = Presensi(40%) + CKP(30%) + BerAKHLAK(30%)
3. Best Employee = Skor tertinggi dari kandidat
```

## 📊 8 Parameter BerAKHLAK

| No | Parameter | Deskripsi |
|----|-----------|-----------|
| 1 | **B**erorientasi Pelayanan | Melayani Sepenuh Hati, Ramah, dan Solutif |
| 2 | **E**ngaged | Bertanggung Jawab, Disiplin, dan Jujur |
| 3 | **R**elevant | Profesional, Senang Belajar, dan Berbagi |
| 4 | **A**daptif | Suka Menolong, Toleransi, Menghargai Keberagaman |
| 5 | **K**ommitted | Menjaga Nama Baik BPS dan Berdedikasi |
| 6 | **H**armonis | Kreatif, Inovatif, dan Siap terhadap Perubahan |
| 7 | **L**oyal | Komunikatif dan Mampu Bekerja Sama |
| 8 | **A**daptable **K**onsisten | Penampilan dan Kerapian |

### 📈 Rentang Nilai
- **🥇 Tokoh BerAKHLAK 1**: 96-100 (Excellent)
- **🥈 Tokoh BerAKHLAK 2**: 86-95 (Good)  
- **🥉 Tokoh BerAKHLAK 3**: 80-85 (Satisfactory)

## 🛠️ Available Scripts

### Backend Scripts
```bash
# Development
npm run dev              # Start with nodemon (auto-reload)
npm start               # Start production server

# Database Management
npm run db:generate     # Generate Prisma client
npm run db:migrate     # Run pending migrations
npm run db:migrate:deploy  # Deploy migrations (production)
npm run db:reset       # Reset database (DANGER!)
npm run db:seed        # Seed initial data
npm run db:studio      # Open Prisma Studio
npm run db:setup       # Migrate + Seed (fresh install)
npm run db:fresh       # Reset + Seed (development)

# Fixes
npm run fix:attendance  # Fix attendance table structure
```

### Frontend Scripts
```bash
npm start              # Start development server (port 3000)
npm run build          # Build for production
npm test               # Run tests
npm run eject          # Eject from Create React App (DANGER!)
```

## 🔧 Environment Variables

### Backend `.env`
```env
# 🗄️ Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/bps_assessment"

# 🔐 JWT Configuration  
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters-long"
JWT_EXPIRES_IN="7d"

# 🌐 Server Configuration
PORT=5000
NODE_ENV="development"

# 🌍 CORS Configuration
FRONTEND_URL="http://localhost:3000"

# 📁 File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH="/uploads"

# 📧 Email Configuration (Optional)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
```

### Frontend Environment (Optional)
Create `frontend/.env` for custom configuration:
```env
# API Configuration
REACT_APP_API_URL="http://localhost:5000/api"
REACT_APP_TITLE="BPS Assessment System"

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_NOTIFICATIONS=true
```

## 📋 Installation Checklist

- [ ] ✅ Node.js v16+ installed
- [ ] ✅ PostgreSQL v12+ installed & running
- [ ] ✅ Git installed
- [ ] ✅ Repository cloned
- [ ] ✅ Backend dependencies installed (`npm install`)
- [ ] ✅ Frontend dependencies installed (`npm install`)
- [ ] ✅ Database created
- [ ] ✅ Environment variables configured (`.env`)
- [ ] ✅ Database migrated (`npm run db:migrate`)
- [ ] ✅ Database seeded (`npm run db:seed`)
- [ ] ✅ Backend server running (`npm run dev`)
- [ ] ✅ Frontend server running (`npm start`)
- [ ] ✅ Application accessible at http://localhost:3000

## 🔍 API Documentation

### 🔐 Authentication Endpoints
```bash
POST   /api/auth/login              # User login
GET    /api/auth/me                 # Get current user info
PUT    /api/auth/change-password    # Change password
POST   /api/auth/register           # Register new user (Admin only)
```

### 👥 User Management
```bash
GET    /api/users                   # Get all users (paginated)
POST   /api/users                   # Create new user
GET    /api/users/:id               # Get user by ID
PUT    /api/users/:id               # Update user
DELETE /api/users/:id               # Soft delete user
GET    /api/users/stats             # Get user statistics
```

### 📊 Evaluation System
```bash
GET    /api/evaluations/parameters        # Get BerAKHLAK parameters
GET    /api/evaluations/active-period     # Get active evaluation period
GET    /api/evaluations/eligible-users    # Get users eligible for evaluation
POST   /api/evaluations/submit            # Submit evaluation
GET    /api/evaluations/my-evaluations    # Get user's evaluations
```

### 📈 Reports & Analytics
```bash
GET    /api/final-evaluations/calculate           # Calculate final scores
GET    /api/final-evaluations/best-employee       # Get best employee
GET    /api/monitoring/evaluation-status          # Monitoring dashboard
GET    /api/monitoring/incomplete-users           # Users who haven't evaluated
```

### 📁 File Management
```bash
POST   /api/import/users              # Import users from Excel
GET    /api/import/template           # Download import template
GET    /api/export/users              # Export users to Excel
POST   /api/profile/upload            # Upload profile picture
```

## 🐛 Troubleshooting

### ❗ Common Issues & Solutions

#### 1. **Database Connection Error**
```bash
# Error: Can't reach database server
# Solution: Check PostgreSQL service
sudo systemctl status postgresql
sudo systemctl start postgresql

# Reset database if corrupted
npm run db:reset
npm run db:seed
```

#### 2. **Prisma Client Issues**
```bash
# Error: Prisma Client not generated
# Solution: Regenerate Prisma client
npm run db:generate

# Clear Prisma cache
rm -rf node_modules/.prisma
npm run db:generate
```

#### 3. **JWT Token Problems**
```bash
# Error: Invalid token / Token expired
# Solution: Clear browser storage
# Open Developer Tools → Application → Storage → Clear All

# Or in browser console:
localStorage.clear()
sessionStorage.clear()
```

#### 4. **File Upload Errors**
```bash
# Error: EACCES permission denied
# Solution: Fix upload directory permissions
chmod 755 backend/uploads
mkdir -p backend/uploads/profiles
mkdir -p backend/uploads/temp
```

#### 5. **Port Already in Use**
```bash
# Error: Port 3000/5000 already in use
# Solution: Kill the process
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:5000 | xargs kill -9  # Backend

# Or use different ports in .env
PORT=5001  # Backend
# Frontend will auto-increment to 3001
```

#### 6. **npm Install Failures**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Use Node.js v18 LTS if issues persist
nvm install 18
nvm use 18
```

## 🚀 Production Deployment

### 🐳 Using Docker (Recommended)
```bash
# Clone repository
git clone https://github.com/yourusername/bps-assessment-system.git
cd bps-assessment-system

# Build and run
docker-compose up --build -d
```

### 🖥️ Manual Server Deployment
```bash
# 1. Setup production database
createdb bps_assessment_prod

# 2. Build frontend
cd frontend
npm run build

# 3. Setup environment
export NODE_ENV=production
export DATABASE_URL="postgresql://..."

# 4. Deploy backend
cd ../backend
npm run db:migrate:deploy
npm run db:seed
npm start

# 5. Serve frontend with nginx
sudo cp -r ../frontend/build/* /var/www/html/
```

### 🌐 Environment Setup
```bash
# Production .env
NODE_ENV="production"
DATABASE_URL="postgresql://user:pass@localhost:5432/bps_assessment_prod"
JWT_SECRET="production-secret-key-min-32-chars"
FRONTEND_URL="https://yourdomain.com"
```

## 📸 Screenshots

> Add screenshots of your application here:

- 🔐 Login Page
- 📊 Admin Dashboard
- 📝 Evaluation Form
- 🏆 Best Employee Report
- 👥 User Management
- 📈 Analytics Dashboard

## 🤝 Contributing

1. **Fork** the repository
2. **Create** feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** Pull Request

### 📝 Development Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation
- Use meaningful commit messages

## 📞 Support & Contact

**🏢 BPS Kabupaten Pringsewu**
- **📧 Email**: bps@pringsewukab.go.id
- **🌐 Website**: https://pringsewukab.bps.go.id
- **📱 Phone**: +62 (0729) 123456

**👨‍💻 Developer Support**
- **GitHub Issues**: [Report Issues](https://github.com/yourusername/bps-assessment-system/issues)
- **Documentation**: [Wiki](https://github.com/yourusername/bps-assessment-system/wiki)

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**🏢 Sistem Penilaian Pegawai BPS Kabupaten Pringsewu**

*Modern Employee Assessment System for Best Employee Selection*

[![Made with ❤️](https://img.shields.io/badge/Made%20with-❤️-red.svg)](https://github.com/yourusername/bps-assessment-system)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?logo=postgresql&logoColor=white)](https://postgresql.org/)

</div>