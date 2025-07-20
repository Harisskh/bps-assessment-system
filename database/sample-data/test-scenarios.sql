-- Test Scenarios for BPS Assessment System
-- Complete scenarios including final evaluation calculation

-- Scenario 1: Multiple evaluators for staff1 (Best Employee candidate)
-- Additional evaluators rating staff1 highly

INSERT INTO evaluations (id, evaluatorId, periodId, targetUserId, status, submitDate, createdAt, updatedAt)
VALUES 
('eval_scenario_001', 'staff_test_004', (SELECT id FROM periods WHERE isActive = true LIMIT 1), 'staff_test_001', 'SUBMITTED', NOW(), NOW(), NOW()),
('eval_scenario_002', 'staff_test_005', (SELECT id FROM periods WHERE isActive = true LIMIT 1), 'staff_test_001', 'SUBMITTED', NOW(), NOW(), NOW());

-- High scores from staff4 to staff1
INSERT INTO evaluation_scores (id, evaluationId, parameterId, score, createdAt)
SELECT 
    'scenario_001_' || LPAD(ROW_NUMBER() OVER()::TEXT, 3, '0'),
    'eval_scenario_001',
    ep.id,
    CASE ep.urutan
        WHEN 1 THEN 94  WHEN 2 THEN 96  WHEN 3 THEN 92  WHEN 4 THEN 95
        WHEN 5 THEN 93  WHEN 6 THEN 91  WHEN 7 THEN 97  WHEN 8 THEN 94
    END,
    NOW()
FROM evaluation_parameters ep WHERE ep.isActive = true ORDER BY ep.urutan;

-- High scores from staff5 to staff1
INSERT INTO evaluation_scores (id, evaluationId, parameterId, score, createdAt)
SELECT 
    'scenario_002_' || LPAD(ROW_NUMBER() OVER()::TEXT, 3, '0'),
    'eval_scenario_002',
    ep.id,
    CASE ep.urutan
        WHEN 1 THEN 96  WHEN 2 THEN 98  WHEN 3 THEN 94  WHEN 4 THEN 97
        WHEN 5 THEN 95  WHEN 6 THEN 93  WHEN 7 THEN 99  WHEN 8 THEN 96
    END,
    NOW()
FROM evaluation_parameters ep WHERE ep.isActive = true ORDER BY ep.urutan;

-- Scenario 2: Moderate evaluations for staff2
INSERT INTO evaluations (id, evaluatorId, periodId, targetUserId, status, submitDate, createdAt, updatedAt)
VALUES 
('eval_scenario_003', 'staff_test_003', (SELECT id FROM periods WHERE isActive = true LIMIT 1), 'staff_test_002', 'SUBMITTED', NOW(), NOW(), NOW()),
('eval_scenario_004', 'staff_test_004', (SELECT id FROM periods WHERE isActive = true LIMIT 1), 'staff_test_002', 'SUBMITTED', NOW(), NOW(), NOW());

-- Moderate scores for staff2
INSERT INTO evaluation_scores (id, evaluationId, parameterId, score, createdAt)
SELECT 
    'scenario_003_' || LPAD(ROW_NUMBER() OVER()::TEXT, 3, '0'),
    'eval_scenario_003',
    ep.id,
    CASE ep.urutan
        WHEN 1 THEN 85  WHEN 2 THEN 87  WHEN 3 THEN 83  WHEN 4 THEN 86
        WHEN 5 THEN 84  WHEN 6 THEN 82  WHEN 7 THEN 88  WHEN 8 THEN 85
    END,
    NOW()
FROM evaluation_parameters ep WHERE ep.isActive = true ORDER BY ep.urutan;

INSERT INTO evaluation_scores (id, evaluationId, parameterId, score, createdAt)
SELECT 
    'scenario_004_' || LPAD(ROW_NUMBER() OVER()::TEXT, 3, '0'),
    'eval_scenario_004',
    ep.id,
    CASE ep.urutan
        WHEN 1 THEN 87  WHEN 2 THEN 89  WHEN 3 THEN 85  WHEN 4 THEN 88
        WHEN 5 THEN 86  WHEN 6 THEN 84  WHEN 7 THEN 90  WHEN 8 THEN 87
    END,
    NOW()
FROM evaluation_parameters ep WHERE ep.isActive = true ORDER BY ep.urutan;

-- Scenario 3: Sample Final Evaluation Calculation
-- This would normally be done by the backend calculation API
INSERT INTO final_evaluations (
    id, userId, periodId, berakhlakScore, presensiScore, ckpScore,
    berakhlakWeighted, presensiWeighted, ckpWeighted, finalScore,
    totalEvaluators, isCandidate, ranking, isBestEmployee,
    createdAt, updatedAt
) VALUES 
(
    'final_test_001',
    'staff_test_001',
    (SELECT id FROM periods WHERE isActive = true LIMIT 1),
    94.5,    -- Average of all BerAKHLAK scores
    100.0,   -- Perfect attendance
    95.5,    -- Excellent CKP
    28.35,   -- 94.5 * 30%
    40.0,    -- 100.0 * 40%
    28.65,   -- 95.5 * 30%
    97.0,    -- Total final score
    4,       -- 4 people evaluated this person
    true,    -- Is candidate (high evaluator count)
    1,       -- Ranking 1st
    true,    -- Is best employee
    NOW(),
    NOW()
),
(
    'final_test_002',
    'staff_test_002',
    (SELECT id FROM periods WHERE isActive = true LIMIT 1),
    86.3,    -- Average BerAKHLAK scores
    90.0,    -- Good attendance
    87.0,    -- Good CKP
    25.89,   -- 86.3 * 30%
    36.0,    -- 90.0 * 40%
    26.1,    -- 87.0 * 30%
    87.99,   -- Total final score
    3,       -- 3 evaluators
    true,    -- Is candidate
    2,       -- Ranking 2nd
    false,   -- Not best employee
    NOW(),
    NOW()
);

-- Sample Certificate Log for Best Employee
INSERT INTO certificate_logs (
    id, user_id, period_id, certificate_number, generated_at, generated_by
) VALUES (
    'cert_test_001',
    'staff_test_001',
    (SELECT id FROM periods WHERE isActive = true LIMIT 1),
    'BPS-PRINGSEWU-2025-01-001',
    NOW(),
    'admin_test_001'
);