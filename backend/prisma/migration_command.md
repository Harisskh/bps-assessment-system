# ⚠️ BACKUP first if you have important data!
pg_dump -U username database_name > backup_before_migration.sql

# Reset dan apply new migration
npx prisma migrate reset --force
npx prisma migrate dev --name "complete_single_berakhlak_system"
npx prisma generate
npx prisma db seed