# BPS Assessment System

Sistem Penilaian Kinerja Pegawai (SIPEKA) BPS

## Deskripsi
Aplikasi ini digunakan untuk penilaian kinerja pegawai di lingkungan BPS. Sistem terdiri dari backend (Node.js + Express + Prisma) dan frontend (React.js). Fitur utama meliputi manajemen user, evaluasi kinerja, absensi, CKP, dashboard statistik, dan monitoring proses penilaian.

---

## Struktur Project

```
backend/
  src/
    controllers/      # Logic API (user, auth, dashboard, dsb)
    middleware/       # Middleware autentikasi & otorisasi
    routes/           # Routing API Express
    services/         # Service/helper
    utils/            # Utility functions
    app.js            # Entry point backend
  prisma/             # Prisma schema & seed data
  package.json        # Konfigurasi backend

frontend/
  src/
    pages/            # Halaman React (Dashboard, Login, Users, dsb)
    components/       # Komponen UI (Navbar, Sidebar, dsb)
    context/          # Context React (Auth)
    services/         # API service (axios)
    utils/            # Utility functions
    App.js            # Routing utama
    index.js          # Entry point frontend
  public/             # Static files
  package.json        # Konfigurasi frontend
```

---

## Cara Menjalankan

### 1. Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm start
```

- Server berjalan di http://localhost:5000
- Konfigurasi database di `.env` backend

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

- Akses aplikasi di http://localhost:3000
- Pastikan variabel `REACT_APP_API_URL` di `.env` frontend mengarah ke backend

---

## Fitur Utama
- Login & Manajemen User (Admin, Pimpinan, Staff)
- Penilaian Kinerja (Evaluasi BerAKHLAK)
- Absensi & CKP
- Dashboard Statistik
- Monitoring Proses Penilaian
- Leaderboard & Best Employee

---

## Akun Default (Seed)
- Admin: username `admin`, password `bps2025`
- Pimpinan & Staff: lihat file `backend/prisma/seed.js`

---

## Pengujian & Build
- Jalankan `npm test` di frontend untuk testing
- Jalankan `npm run build` di frontend untuk build production

---

## Lisensi
Aplikasi ini dikembangkan untuk kebutuhan internal BPS.
