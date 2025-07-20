# Database Design Decisions

## Architecture Overview
- **PostgreSQL**: Robust relational database
- **Prisma ORM**: Type-safe database access
- **Single BerAKHLAK Category**: Simplified from 3-tier to 1-tier system

## Key Design Decisions

### 1. Single BerAKHLAK Category (Version 2.0)
**Decision**: Changed from 3 categories (Tokoh 1/2/3) to single category
**Rationale**: 
- Simplified user experience
- Easier calculations
- More flexible scoring (80-100 range)
- Higher final scores possible

### 2. Multi-Role System
**Decision**: Array-based roles with primary role
**Rationale**:
- Future flexibility for users with multiple roles
- Backward compatibility with single role
- Admin expiry for temporary permissions

### 3. Enhanced Attendance System
**Decision**: Both boolean flags AND frequency counts
**Rationale**:
- Backward compatibility
- Detailed tracking for better analytics
- Tiered penalty system based on frequency

### 4. Certificate System
**Decision**: Separate certificate_logs table
**Rationale**:
- Audit trail for certificate generation
- Prevent duplicate certificates
- Track who generated certificates

## Performance Considerations
- Composite unique indexes for common queries
- Foreign key constraints for data integrity
- Optimized for read-heavy workloads (reports)