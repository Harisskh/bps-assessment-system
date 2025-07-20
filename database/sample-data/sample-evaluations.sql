-- Sample Evaluations for Testing Single BerAKHLAK Category
-- Based on active period and sample users

-- Sample evaluation from staff1 to staff2
INSERT INTO evaluations (
    id, evaluatorId, periodId, targetUserId, status, submitDate, createdAt, updatedAt
) VALUES (
    'eval_test_001',
    'staff_test_001',
    (SELECT id FROM periods WHERE isActive = true LIMIT 1),
    'staff_test_002',
    'SUBMITTED',
    NOW(),
    NOW(),
    NOW()
);

-- Sample evaluation scores for 8 parameters (80-100 range)
INSERT INTO evaluation_scores (id, evaluationId, parameterId, score, createdAt)
SELECT 
    'score_test_' || LPAD(ROW_NUMBER() OVER()::TEXT, 3, '0'),
    'eval_test_001',
    ep.id,
    CASE ep.urutan
        WHEN 1 THEN 88  -- Melayani
        WHEN 2 THEN 92  -- Bertanggung Jawab
        WHEN 3 THEN 85  -- Profesional
        WHEN 4 THEN 90  -- Suka Menolong
        WHEN 5 THEN 87  -- Menjaga Nama Baik
        WHEN 6 THEN 83  -- Kreatif
        WHEN 7 THEN 91  -- Komunikatif
        WHEN 8 THEN 89  -- Penampilan
    END,
    NOW()
FROM evaluation_parameters ep
WHERE ep.isActive = true
ORDER BY ep.urutan;

-- Sample evaluation from staff2 to staff1
INSERT INTO evaluations (
    id, evaluatorId, periodId, targetUserId, status, submitDate, createdAt, updatedAt
) VALUES (
    'eval_test_002',
    'staff_test_002',
    (SELECT id FROM periods WHERE isActive = true LIMIT 1),
    'staff_test_001',
    'SUBMITTED',
    NOW(),
    NOW()
);

-- Sample evaluation scores for staff1 (higher scores)
INSERT INTO evaluation_scores (id, evaluationId, parameterId, score, createdAt)
SELECT 
    'score_test_' || LPAD((ROW_NUMBER() OVER() + 8)::TEXT, 3, '0'),
    'eval_test_002',
    ep.id,
    CASE ep.urutan
        WHEN 1 THEN 95  -- Melayani
        WHEN 2 THEN 97  -- Bertanggung Jawab
        WHEN 3 THEN 93  -- Profesional
        WHEN 4 THEN 96  -- Suka Menolong
        WHEN 5 THEN 94  -- Menjaga Nama Baik
        WHEN 6 THEN 92  -- Kreatif
        WHEN 7 THEN 98  -- Komunikatif
        WHEN 8 THEN 95  -- Penampilan
    END,
    NOW()
FROM evaluation_parameters ep
WHERE ep.isActive = true
ORDER BY ep.urutan;

-- Sample evaluation from staff3 to staff1 (making staff1 popular)
INSERT INTO evaluations (
    id, evaluatorId, periodId, targetUserId, status, submitDate, createdAt, updatedAt
) VALUES (
    'eval_test_003',
    'staff_test_003',
    (SELECT id FROM periods WHERE isActive = true LIMIT 1),
    'staff_test_001',
    'SUBMITTED',
    NOW(),
    NOW()
);

-- Sample evaluation scores for staff1 (good scores)
INSERT INTO evaluation_scores (id, evaluationId, parameterId, score, createdAt)
SELECT 
    'score_test_' || LPAD((ROW_NUMBER() OVER() + 16)::TEXT, 3, '0'),
    'eval_test_003',
    ep.id,
    CASE ep.urutan
        WHEN 1 THEN 91  -- Melayani
        WHEN 2 THEN 93  -- Bertanggung Jawab
        WHEN 3 THEN 89  -- Profesional
        WHEN 4 THEN 92  -- Suka Menolong
        WHEN 5 THEN 90  -- Menjaga Nama Baik
        WHEN 6 THEN 88  -- Kreatif
        WHEN 7 THEN 94  -- Komunikatif
        WHEN 8 THEN 91  -- Penampilan
    END,
    NOW()
FROM evaluation_parameters ep
WHERE ep.isActive = true
ORDER BY ep.urutan;