# BPS Assessment Database Documentation

## Overview
Database PostgreSQL untuk Sistem Penilaian Pegawai BPS Kabupaten Pringsewu menggunakan Prisma ORM.

## Quick Reference
- **Database**: PostgreSQL v12+
- **ORM**: Prisma v5.22.0
- **Schema Location**: `backend/prisma/schema.prisma`
- **Migrations**: `backend/prisma/migrations/`

## Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed initial data  
npx prisma db seed