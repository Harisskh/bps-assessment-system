-- Migration Script: BerAKHLAK Single Category Update
-- File: migrations/20250715_single_berakhlak_category.sql

-- ==============================================
-- 1. UPDATE EXISTING EVALUATIONS TABLE
-- ==============================================

-- Remove ranking column from evaluations table
ALTER TABLE evaluations DROP COLUMN IF EXISTS ranking;

-- Update unique constraint to remove ranking
ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_evaluatorId_periodId_targetUserId_key;
ALTER TABLE evaluations ADD CONSTRAINT evaluations_evaluatorId_periodId_targetUserId_key 
    UNIQUE (evaluatorId, periodId, targetUserId);

-- ==============================================
-- 2. UPDATE FINAL EVALUATIONS TABLE
-- ==============================================

-- Remove tokoh1Count, tokoh2Count, tokoh3Count columns
ALTER TABLE final_evaluations DROP COLUMN IF EXISTS tokoh1Count;
ALTER TABLE final_evaluations DROP COLUMN IF EXISTS tokoh2Count;
ALTER TABLE final_evaluations DROP COLUMN IF EXISTS tokoh3Count;

-- ==============================================
-- 3. UPDATE RENTANG NILAI TABLE
-- ==============================================

-- Delete existing ranges
DELETE FROM rentang_nilai;

-- Insert single range for BerAKHLAK
INSERT INTO rentang_nilai (id, kategori, ranking, nilaiMin, nilaiMax, deskripsi, createdAt) 
VALUES (
    'berakhlak-single', 
    'berakhlak', 
    1, 
    80, 
    100, 
    'Tokoh BerAKHLAK', 
    NOW()
);

-- ==============================================
-- 4. UPDATE ATTENDANCE TABLE FOR TIERED RULES
-- ==============================================

-- Add new frequency-based columns if they don't exist
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS jumlahTidakKerja INT DEFAULT 0;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS jumlahPulangAwal INT DEFAULT 0;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS jumlahTelat INT DEFAULT 0;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS jumlahAbsenApel INT DEFAULT 0;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS jumlahCuti INT DEFAULT 0;

-- Update existing records to use new calculation method
-- This is a migration script to convert boolean flags to frequency counts
UPDATE attendance SET 
    jumlahTidakKerja = CASE WHEN adaTidakKerja = true THEN 1 ELSE 0 END,
    jumlahPulangAwal = CASE WHEN adaPulangAwal = true THEN 1 ELSE 0 END,
    jumlahTelat = CASE WHEN adaTelat = true THEN 1 ELSE 0 END,
    jumlahAbsenApel = CASE WHEN adaAbsenApel = true THEN 1 ELSE 0 END,
    jumlahCuti = CASE WHEN adaCuti = true THEN 1 ELSE 0 END
WHERE jumlahTidakKerja = 0 AND jumlahPulangAwal = 0 AND jumlahTelat = 0 AND jumlahAbsenApel = 0 AND jumlahCuti = 0;

-- ==============================================
-- 5. FUNCTION: CALCULATE ATTENDANCE SCORE WITH TIERED RULES
-- ==============================================

CREATE OR REPLACE FUNCTION calculate_attendance_score(
    tidak_kerja_count INT,
    pulang_awal_count INT,
    telat_count INT,
    absen_apel_count INT,
    cuti_count INT
) RETURNS FLOAT AS $$
DECLARE
    pengurangan_tk FLOAT := 0;
    pengurangan_psw FLOAT := 0;
    pengurangan_tlt FLOAT := 0;
    pengurangan_apel FLOAT := 0;
    pengurangan_ct FLOAT := 0;
    total_minus FLOAT := 0;
    nilai_presensi FLOAT := 100;
BEGIN
    -- TK (Tidak Kerja): 1x = -20%, >1x = -30% max
    IF tidak_kerja_count = 1 THEN
        pengurangan_tk := 20;
    ELSIF tidak_kerja_count > 1 THEN
        pengurangan_tk := 30;
    END IF;
    
    -- PSW (Pulang Sebelum Waktunya): 1x = -5%, >1x = -10% max
    IF pulang_awal_count = 1 THEN
        pengurangan_psw := 5;
    ELSIF pulang_awal_count > 1 THEN
        pengurangan_psw := 10;
    END IF;
    
    -- TLT (Telat): 1x = -5%, >1x = -10% max
    IF telat_count = 1 THEN
        pengurangan_tlt := 5;
    ELSIF telat_count > 1 THEN
        pengurangan_tlt := 10;
    END IF;
    
    -- APEL (Absen Apel): any count = -10% max
    IF absen_apel_count > 0 THEN
        pengurangan_apel := 10;
    END IF;
    
    -- CT (Cuti): <3x = -2.5%, ≥3x = -5% max
    IF cuti_count > 0 AND cuti_count < 3 THEN
        pengurangan_ct := 2.5;
    ELSIF cuti_count >= 3 THEN
        pengurangan_ct := 5;
    END IF;
    
    -- Calculate total minus
    total_minus := pengurangan_tk + pengurangan_psw + pengurangan_tlt + pengurangan_apel + pengurangan_ct;
    
    -- Calculate final score
    nilai_presensi := 100 - total_minus;
    
    -- Ensure minimum score is 0
    IF nilai_presensi < 0 THEN
        nilai_presensi := 0;
    END IF;
    
    RETURN nilai_presensi;
END;
$ LANGUAGE plpgsql;

-- ==============================================
-- 6. UPDATE EXISTING ATTENDANCE RECORDS
-- ==============================================

-- Update penguranganTK, penguranganPSW, penguranganTLT, penguranganAPEL, penguranganCT
UPDATE attendance SET 
    penguranganTK = CASE 
        WHEN jumlahTidakKerja = 1 THEN 20
        WHEN jumlahTidakKerja > 1 THEN 30
        ELSE 0 
    END,
    penguranganPSW = CASE 
        WHEN jumlahPulangAwal = 1 THEN 5
        WHEN jumlahPulangAwal > 1 THEN 10
        ELSE 0 
    END,
    penguranganTLT = CASE 
        WHEN jumlahTelat = 1 THEN 5
        WHEN jumlahTelat > 1 THEN 10
        ELSE 0 
    END,
    penguranganAPEL = CASE 
        WHEN jumlahAbsenApel > 0 THEN 10
        ELSE 0 
    END,
    penguranganCT = CASE 
        WHEN jumlahCuti > 0 AND jumlahCuti < 3 THEN 2.5
        WHEN jumlahCuti >= 3 THEN 5
        ELSE 0 
    END;

-- Update totalMinus and nilaiPresensi
UPDATE attendance SET 
    totalMinus = penguranganTK + penguranganPSW + penguranganTLT + penguranganAPEL + penguranganCT,
    nilaiPresensi = GREATEST(0, 100 - (penguranganTK + penguranganPSW + penguranganTLT + penguranganAPEL + penguranganCT));

-- ==============================================
-- 7. FUNCTION: CALCULATE BERAKHLAK SCORE (SINGLE CATEGORY)
-- ==============================================

CREATE OR REPLACE FUNCTION calculate_berakhlak_score(
    user_id VARCHAR,
    period_id VARCHAR
) RETURNS FLOAT AS $
DECLARE
    total_score FLOAT := 0;
    evaluation_count INT := 0;
    final_score FLOAT := 0;
BEGIN
    -- Get all evaluations for this user in this period
    SELECT 
        SUM(
            (SELECT SUM(score) FROM evaluation_scores es WHERE es.evaluationId = e.id)
        ),
        COUNT(*)
    INTO total_score, evaluation_count
    FROM evaluations e
    WHERE e.targetUserId = user_id AND e.periodId = period_id;
    
    -- If no evaluations, return 0
    IF evaluation_count = 0 THEN
        RETURN 0;
    END IF;
    
    -- Calculate final score: sum of all scores (no averaging)
    final_score := COALESCE(total_score, 0);
    
    RETURN final_score;
END;
$ LANGUAGE plpgsql;

-- ==============================================
-- 8. FUNCTION: CALCULATE FINAL EVALUATION SCORE
-- ==============================================

CREATE OR REPLACE FUNCTION calculate_final_evaluation(
    user_id VARCHAR,
    period_id VARCHAR
) RETURNS VOID AS $
DECLARE
    berakhlak_score FLOAT := 0;
    presensi_score FLOAT := 0;
    ckp_score FLOAT := 0;
    total_evaluators INT := 0;
    final_score FLOAT := 0;
BEGIN
    -- Get BerAKHLAK score
    SELECT calculate_berakhlak_score(user_id, period_id) INTO berakhlak_score;
    
    -- Get total evaluators count
    SELECT COUNT(*) INTO total_evaluators
    FROM evaluations e
    WHERE e.targetUserId = user_id AND e.periodId = period_id;
    
    -- Get presensi score
    SELECT COALESCE(nilaiPresensi, 0) INTO presensi_score
    FROM attendance a
    WHERE a.userId = user_id AND a.periodId = period_id;
    
    -- Get CKP score
    SELECT COALESCE(score, 0) INTO ckp_score
    FROM ckp_scores c
    WHERE c.userId = user_id AND c.periodId = period_id;
    
    -- Calculate weighted scores
    -- Note: BerAKHLAK can now exceed 100 since it's total sum
    final_score := (berakhlak_score * 0.3) + (presensi_score * 0.4) + (ckp_score * 0.3);
    
    -- Upsert final evaluation
    INSERT INTO final_evaluations (
        userId, periodId, berakhlakScore, presensiScore, ckpScore,
        berakhlakWeighted, presensiWeighted, ckpWeighted, finalScore,
        totalEvaluators, isCandidate, createdAt, updatedAt
    ) VALUES (
        user_id, period_id, berakhlak_score, presensi_score, ckp_score,
        (berakhlak_score * 0.3), (presensi_score * 0.4), (ckp_score * 0.3),
        final_score, total_evaluators, 
        (total_evaluators >= (SELECT DISTINCT COUNT(*) FROM (
            SELECT targetUserId, COUNT(*) as eval_count 
            FROM evaluations 
            WHERE periodId = period_id 
            GROUP BY targetUserId 
            ORDER BY eval_count DESC 
            LIMIT 2
        ) top_2)),
        NOW(), NOW()
    )
    ON CONFLICT (userId, periodId) DO UPDATE SET
        berakhlakScore = EXCLUDED.berakhlakScore,
        presensiScore = EXCLUDED.presensiScore,
        ckpScore = EXCLUDED.ckpScore,
        berakhlakWeighted = EXCLUDED.berakhlakWeighted,
        presensiWeighted = EXCLUDED.presensiWeighted,
        ckpWeighted = EXCLUDED.ckpWeighted,
        finalScore = EXCLUDED.finalScore,
        totalEvaluators = EXCLUDED.totalEvaluators,
        isCandidate = EXCLUDED.isCandidate,
        updatedAt = NOW();
END;
$ LANGUAGE plpgsql;

-- ==============================================
-- 9. TRIGGER: AUTO-CALCULATE ON EVALUATION CHANGES
-- ==============================================

CREATE OR REPLACE FUNCTION trigger_recalculate_final_evaluation()
RETURNS TRIGGER AS $
BEGIN
    -- Recalculate for the target user
    IF TG_OP = 'DELETE' THEN
        PERFORM calculate_final_evaluation(OLD.targetUserId, OLD.periodId);
        RETURN OLD;
    ELSE
        PERFORM calculate_final_evaluation(NEW.targetUserId, NEW.periodId);
        RETURN NEW;
    END IF;
END;
$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS evaluation_final_calculation_trigger ON evaluations;

-- Create new trigger
CREATE TRIGGER evaluation_final_calculation_trigger
    AFTER INSERT OR UPDATE OR DELETE ON evaluations
    FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_final_evaluation();

-- ==============================================
-- 10. SEED DATA: UPDATE EVALUATION PARAMETERS
-- ==============================================

-- Insert/Update the 8 BerAKHLAK parameters
INSERT INTO evaluation_parameters (id, namaParameter, deskripsi, urutan, isActive, createdAt) VALUES
('param-1', 'Perilaku Melayani Sepenuh Hati, Ramah, dan Solutif', 'Memberikan pelayanan terbaik dengan sikap ramah dan memberikan solusi', 1, true, NOW()),
('param-2', 'Perilaku Bertanggung Jawab, Disiplin, dan Jujur', 'Menunjukkan tanggung jawab, kedisiplinan, dan kejujuran dalam bekerja', 2, true, NOW()),
('param-3', 'Perilaku Profesional, Senang Belajar, dan Berbagi Pengetahuan', 'Bekerja secara profesional, terus belajar, dan berbagi ilmu', 3, true, NOW()),
('param-4', 'Perilaku Suka Menolong, Toleransi, dan Menghargai Keberagaman', 'Membantu sesama, toleran, dan menghargai perbedaan', 4, true, NOW()),
('param-5', 'Perilaku Menjaga Nama Baik BPS dan Berdedikasi', 'Menjaga reputasi institusi dan berdedikasi tinggi', 5, true, NOW()),
('param-6', 'Perilaku Kreatif, Inovatif, dan Siap terhadap Perubahan', 'Berpikir kreatif, inovatif, dan adaptif terhadap perubahan', 6, true, NOW()),
('param-7', 'Perilaku Komunikatif dan Mampu Bekerja Sama antar Tim Kerja', 'Komunikasi yang baik dan mampu bekerja sama dalam tim', 7, true, NOW()),
('param-8', 'Penampilan dan Kerapian', 'Menjaga penampilan yang rapi dan profesional', 8, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    namaParameter = EXCLUDED.namaParameter,
    deskripsi = EXCLUDED.deskripsi,
    urutan = EXCLUDED.urutan,
    isActive = EXCLUDED.isActive;

-- ==============================================
-- 11. DATA CLEANUP
-- ==============================================

-- Remove old ranking-based data that might be inconsistent
-- This ensures clean state for single category system

-- Update system settings for new calculation method
INSERT INTO system_settings (id, key, value, description, createdAt, updatedAt) VALUES
('berakhlak-method', 'CALCULATION_METHOD', 'SINGLE_CATEGORY', 'BerAKHLAK calculation method: SINGLE_CATEGORY (new) vs THREE_CATEGORY (old)', NOW(), NOW()),
('berakhlak-range', 'SCORE_RANGE', '80-100', 'Score range for BerAKHLAK evaluation', NOW(), NOW()),
('berakhlak-weight', 'BERAKHLAK_WEIGHT', '0.3', 'Weight for BerAKHLAK in final calculation', NOW(), NOW()),
('presensi-weight', 'PRESENSI_WEIGHT', '0.4', 'Weight for Presensi in final calculation', NOW(), NOW()),
('ckp-weight', 'CKP_WEIGHT', '0.3', 'Weight for CKP in final calculation', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updatedAt = NOW();

