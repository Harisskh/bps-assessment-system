# 🎨 BPS Assessment System - Frontend

> React.js Frontend untuk Sistem Penilaian Pegawai BPS Kabupaten Pringsewu

![React](https://img.shields.io/badge/React-v19.1.0-blue.svg)
![Bootstrap](https://img.shields.io/badge/Bootstrap-v5.3.0-purple.svg)
![SASS](https://img.shields.io/badge/SASS-v1.89.2-pink.svg)

## 📋 Overview

Frontend aplikasi BPS Assessment System yang dibangun dengan **React 19.1.0** dan **React Bootstrap 5.3.0**. Aplikasi ini menyediakan interface untuk 3 role user: **Staff**, **Admin**, dan **Pimpinan** dengan fitur penilaian Tokoh BerAKHLAK, manajemen data pegawai, dan dashboard analytics.

## 🚀 Tech Stack

- **Framework**: React 19.1.0
- **UI Library**: React Bootstrap 2.10.10 + Bootstrap 5.3.0
- **Routing**: React Router DOM 7.6.3
- **HTTP Client**: Axios 1.10.0
- **Styling**: SASS 1.89.2
- **Icons**: FontAwesome 6.7.2
- **Form Components**: React Select 5.10.1
- **File Processing**: XLSX 0.18.5
- **Testing**: React Testing Library 16.3.0

## 🎯 Key Features

### 👤 **Staff User Interface**
- **🔐 Login System** - Username-based authentication
- **📝 Evaluation Form** - Penilaian Tokoh BerAKHLAK untuk 3 pegawai
- **📊 Parameter Rating** - Input nilai 8 parameter BerAKHLAK (80-100)
- **📱 Responsive Design** - Mobile-friendly interface

### 👨‍💼 **Admin Dashboard**
- **👥 User Management** - CRUD operations untuk data pegawai
- **📊 Excel Import/Export** - Import pegawai dari Excel, export reports
- **⏰ Attendance Management** - Input manual data presensi
- **📈 CKP Management** - Input manual Capaian Kinerja Pegawai
- **🏆 Best Employee Processing** - Perhitungan otomatis best employee
- **📋 Period Management** - Kelola periode penilaian

### 👔 **Leader Dashboard**
- **📊 Analytics Dashboard** - Grafik dan visualisasi data
- **📈 Monitoring System** - Status pengisian penilaian pegawai
- **🏆 Leaderboard** - Best Employee of the Month
- **📱 Real-time Updates** - Data terkini via API

## 🛠️ Available Scripts

### Development
```bash
# Start development server (port 3000)
npm start

# Compile dan hot-reload untuk development
# Otomatis buka browser ke http://localhost:3000
```

### Production Build
```bash
# Build optimized production bundle
npm run build

# Generate minified files di folder build/
# Ready untuk deployment ke web server
```

### Testing
```bash
# Run test suite dalam watch mode
npm test

# Run test dengan coverage report
npm test -- --coverage

# Run test sekali tanpa watch mode
npm test -- --watchAll=false
```

### Code Quality
```bash
# Eject dari Create React App (WARNING: irreversible!)
npm run eject

# Format code dengan Prettier (jika dikonfigurasi)
npm run format

# Lint code dengan ESLint (jika dikonfigurasi)
npm run lint
```

## 🔧 Environment Configuration

### Environment Variables
Buat file `.env` di root folder frontend (opsional):

```env
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_FRONTEND_URL=http://localhost:3000

# App Configuration
REACT_APP_TITLE=BPS Assessment System
REACT_APP_VERSION=1.0.0

# Feature Flags
REACT_APP_ENABLE_DEBUG=true
REACT_APP_ENABLE_ANALYTICS=false

# Upload Configuration
REACT_APP_MAX_FILE_SIZE=5242880
REACT_APP_ALLOWED_FILE_TYPES=.jpg,.jpeg,.png,.xlsx,.xls
```

### API Configuration
File `src/services/api.js` mengatur koneksi ke backend:

```javascript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
```

## 📦 Dependencies Explanation

### Core React Ecosystem
```json
{
  "react": "^19.1.0",              // React framework
  "react-dom": "^19.1.0",          // React DOM rendering
  "react-router-dom": "^7.6.3",    // Client-side routing
  "react-scripts": "5.0.1"         // Build tools & configuration
}
```

### UI & Styling
```json
{
  "react-bootstrap": "^2.10.10",        // React Bootstrap components
  "bootstrap": "^5.3.0",               // Bootstrap CSS framework
  "@fortawesome/fontawesome-free": "^6.7.2",  // FontAwesome icons
  "sass": "^1.89.2"                    // SASS preprocessor
}
```

### Form & Data Handling
```json
{
  "react-select": "^5.10.1",      // Advanced select components
  "axios": "^1.10.0",             // HTTP client untuk API calls
  "xlsx": "^0.18.5"               // Excel file processing (client-side)
}
```

### Testing & Quality
```json
{
  "@testing-library/react": "^16.3.0",        // React component testing
  "@testing-library/jest-dom": "^6.6.3",      // Jest DOM matchers
  "@testing-library/user-event": "^13.5.0",   // User interaction simulation
  "@testing-library/dom": "^10.4.0",          // DOM testing utilities
  "web-vitals": "^2.1.4"                      // Performance metrics
}
```

## 🎨 Styling Architecture

### SASS Structure
```scss
// src/styles/globals/_variables.scss
$primary-color: #0d6efd;
$secondary-color: #6c757d;
$success-color: #198754;
$danger-color: #dc3545;

// src/styles/globals/_mixins.scss
@mixin button-variant($bg-color) {
  background-color: $bg-color;
  border-color: $bg-color;
  
  &:hover {
    background-color: darken($bg-color, 10%);
  }
}

// src/styles/components/_header.scss
.app-header {
  @include button-variant($primary-color);
  // Component-specific styles
}
```

### Bootstrap Customization
```scss
// src/styles/globals/_bootstrap-overrides.scss
:root {
  --bs-primary: #0d6efd;
  --bs-secondary: #6c757d;
  --bs-font-family-sans-serif: 'Segoe UI', system-ui, sans-serif;
}

.btn-primary {
  @include button-variant(var(--bs-primary));
}
```

## 🔗 API Integration

### Service Layer Pattern
```javascript
// src/services/evaluationService.js
import api from './api';

export const evaluationAPI = {
  // Get evaluation parameters
  getParameters: () => api.get('/evaluations/parameters'),
  
  // Submit evaluation
  submitEvaluation: (data) => api.post('/evaluations/submit', data),
  
  // Get user's evaluations
  getMyEvaluations: () => api.get('/evaluations/my-evaluations')
};
```

### Error Handling
```javascript
// src/utils/errorHandler.js
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    return error.response.data.message || 'Server error occurred';
  } else if (error.request) {
    // Request made but no response
    return 'Network error - please check your connection';
  } else {
    // Something else happened
    return 'An unexpected error occurred';
  }
};
```

## 📱 Responsive Design

### Breakpoints
```scss
// Bootstrap 5 breakpoints
$breakpoints: (
  xs: 0,
  sm: 576px,
  md: 768px,
  lg: 992px,
  xl: 1200px,
  xxl: 1400px
);

// Custom responsive mixins
@mixin mobile {
  @media (max-width: 767px) { @content; }
}

@mixin tablet {
  @media (min-width: 768px) and (max-width: 991px) { @content; }
}

@mixin desktop {
  @media (min-width: 992px) { @content; }
}
```

### Mobile-First Components
```jsx
// src/components/common/Sidebar.jsx
const Sidebar = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  return (
    <div className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
      {/* Mobile toggle button */}
      <button 
        className="d-lg-none mobile-toggle"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        ☰
      </button>
      
      {/* Sidebar content */}
      <nav className="sidebar-nav">
        {/* Navigation items */}
      </nav>
    </div>
  );
};
```

## 🧪 Testing

### Component Testing
```javascript
// src/components/__tests__/LoginForm.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import LoginForm from '../LoginForm';

test('renders login form with username and password fields', () => {
  render(<LoginForm />);
  
  expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
});

test('submits form with correct data', async () => {
  const mockOnSubmit = jest.fn();
  render(<LoginForm onSubmit={mockOnSubmit} />);
  
  fireEvent.change(screen.getByLabelText(/username/i), {
    target: { value: 'admin' }
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: 'admin123' }
  });
  
  fireEvent.click(screen.getByRole('button', { name: /login/i }));
  
  expect(mockOnSubmit).toHaveBeenCalledWith({
    username: 'admin',
    password: 'admin123'
  });
});
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage --watchAll=false

# Run specific test file
npm test LoginForm.test.js

# Run tests matching pattern
npm test -- --testNamePattern="login"
```

## 🚀 Production Deployment

### Build Process
```bash
# Create production build
npm run build

# Output akan ada di folder build/
ls build/
# static/  index.html  manifest.json  favicon.ico
```

### Serve Static Files
```bash
# Install serve package globally
npm install -g serve

# Serve production build
serve -s build -l 3000

# Atau dengan npx (tanpa install global)
npx serve -s build
```

### Environment-Specific Builds
```bash
# Development build
REACT_APP_ENV=development npm run build

# Staging build
REACT_APP_ENV=staging npm run build

# Production build
REACT_APP_ENV=production npm run build
```

## 🔧 Development Tips

### Hot Reload & Fast Refresh
```javascript
// React 19 Fast Refresh otomatis aktif
// Perubahan komponen akan langsung terupdate tanpa refresh
// State akan dipertahankan saat editing

// Untuk memaksa full reload jika diperlukan:
if (module.hot) {
  module.hot.accept();
}
```

### Debugging
```javascript
// React Developer Tools extension untuk browser
// Console debugging
console.log('Debug info:', data);

// React Error Boundary untuk error handling
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}
```

### Performance Optimization
```javascript
// React.memo untuk mencegah re-render yang tidak perlu
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* Expensive rendering */}</div>;
});

// useMemo untuk expensive calculations
const expensiveValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);

// useCallback untuk stable function references
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

## 🐛 Common Issues & Solutions

### 1. **CORS Issues**
```javascript
// Pastikan backend mengizinkan frontend URL
// Backend di app.js harus ada:
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

### 2. **Bootstrap Styles Not Loading**
```scss
// Import Bootstrap di src/index.js atau src/App.js
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
```

### 3. **Routing Issues**
```jsx
// Pastikan BrowserRouter di index.js
import { BrowserRouter } from 'react-router-dom';

ReactDOM.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
  document.getElementById('root')
);
```

### 4. **API Connection Failed**
```javascript
// Check environment variables
console.log('API URL:', process.env.REACT_APP_API_BASE_URL);

// Check network tab di browser developer tools
// Pastikan backend running di port yang benar
```

## 📞 Support

### Development Resources
- **React Documentation**: https://react.dev/
- **React Bootstrap**: https://react-bootstrap.github.io/
- **React Router**: https://reactrouter.com/
- **SASS Documentation**: https://sass-lang.com/

### Project Support
- **Main Repository**: [BPS Assessment System](https://github.com/yourusername/bps-assessment-system)
- **Frontend Issues**: Create issue dengan label `frontend`
- **API Documentation**: Lihat backend README.md

---

<div align="center">

**🎨 BPS Assessment System Frontend**

*React-powered User Interface for Employee Assessment*

[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![SASS](https://img.shields.io/badge/SASS-CC6699?logo=sass&logoColor=white)](https://sass-lang.com/)

</div>