# Sample Data for BPS Assessment System

## Overview
This folder contains sample data untuk testing dan development BPS Assessment System.

## Files Description

### Core Sample Data
- **`sample-users.sql`** - 7 test users (1 admin, 1 pimpinan, 5 staff)
- **`sample-evaluations.sql`** - Basic evaluations between staff members
- **`sample-attendance.sql`** - Various attendance scenarios (perfect to problematic)
- **`sample-ckp.sql`** - CKP scores ranging from 72.5 to 95.5

### Advanced Testing
- **`test-scenarios.sql`** - Complex scenarios including:
  - Multiple evaluators for same person
  - Final evaluation calculations
  - Best employee determination
  - Certificate generation

## Usage

### Load All Sample Data
```bash
# Load in correct order
psql -U username -d database_name -f sample-users.sql
psql -U username -d database_name -f sample-evaluations.sql
psql -U username -d database_name -f sample-attendance.sql
psql -U username -d database_name -f sample-ckp.sql
psql -U username -d database_name -f test-scenarios.sql