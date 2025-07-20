-- Cleanup script for development/testing
-- WARNING: This will delete all data!

-- Delete in correct order (child tables first)
DELETE FROM evaluation_scores;
DELETE FROM evaluations;
DELETE FROM final_evaluations;
DELETE FROM certificate_logs;
DELETE FROM attendance;
DELETE FROM ckp_scores;
DELETE FROM evaluation_parameters;
DELETE FROM periods;
DELETE FROM users WHERE role != 'ADMIN';

-- Reset sequences if using SERIAL columns
-- (Not needed for Prisma CUID, but good practice)

-- Verify cleanup
SELECT 'users' as table_name, COUNT(*) as remaining_records FROM users
UNION ALL
SELECT 'periods', COUNT(*) FROM periods
UNION ALL
SELECT 'evaluations', COUNT(*) FROM evaluations;