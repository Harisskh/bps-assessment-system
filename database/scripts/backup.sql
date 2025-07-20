-- BPS Assessment Database Backup Script
-- Usage: psql -U username -d database_name -f backup.sql

-- Create backup directory structure
\echo 'Creating backup of BPS Assessment Database...'

-- Export all tables with data
\copy users TO 'backup/users.csv' CSV HEADER;
\copy periods TO 'backup/periods.csv' CSV HEADER;
\copy evaluation_parameters TO 'backup/evaluation_parameters.csv' CSV HEADER;
\copy evaluations TO 'backup/evaluations.csv' CSV HEADER;
\copy evaluation_scores TO 'backup/evaluation_scores.csv' CSV HEADER;
\copy attendance TO 'backup/attendance.csv' CSV HEADER;
\copy ckp_scores TO 'backup/ckp_scores.csv' CSV HEADER;
\copy final_evaluations TO 'backup/final_evaluations.csv' CSV HEADER;
\copy certificate_logs TO 'backup/certificate_logs.csv' CSV HEADER;

\echo 'Backup completed successfully!'
\echo 'Files saved to backup/ directory'