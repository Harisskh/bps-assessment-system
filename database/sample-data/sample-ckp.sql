-- Sample CKP (Capaian Kinerja Pegawai) Data for Testing
-- Various performance scores from excellent to needs improvement

-- Excellent CKP (staff1)
INSERT INTO ckp_scores (
    id, userId, periodId, score, keterangan, inputBy, createdAt, updatedAt
) VALUES (
    'ckp_test_001',
    'staff_test_001',
    (SELECT id FROM periods WHERE isActive = true LIMIT 1),
    95.5,
    'Capaian sangat baik - semua target tercapai dengan kualitas tinggi',
    'admin_test_001',
    NOW(),
    NOW()
);

-- Good CKP (staff2)
INSERT INTO ckp_scores (
    id, userId, periodId, score, keterangan, inputBy, createdAt, updatedAt
) VALUES (
    'ckp_test_002',
    'staff_test_002',
    (SELECT id FROM periods WHERE isActive = true LIMIT 1),
    87.0,
    'Capaian baik - sebagian besar target tercapai',
    'admin_test_001',
    NOW(),
    NOW()
);

-- Average CKP (staff3)
INSERT INTO ckp_scores (
    id, userId, periodId, score, keterangan, inputBy, createdAt, updatedAt
) VALUES (
    'ckp_test_003',
    'staff_test_003',
    (SELECT id FROM periods WHERE isActive = true LIMIT 1),
    72.5,
    'Capaian cukup - beberapa target belum tercapai optimal',
    'admin_test_001',
    NOW(),
    NOW()
);

-- Good CKP (staff4)
INSERT INTO ckp_scores (
    id, userId, periodId, score, keterangan, inputBy, createdAt, updatedAt
) VALUES (
    'ckp_test_004',
    'staff_test_004',
    (SELECT id FROM periods WHERE isActive = true LIMIT 1),
    84.3,
    'Capaian baik - konsisten dalam pencapaian target',
    'admin_test_001',
    NOW(),
    NOW()
);

-- Very Good CKP (staff5)
INSERT INTO ckp_scores (
    id, userId, periodId, score, keterangan, inputBy, createdAt, updatedAt
) VALUES (
    'ckp_test_005',
    'staff_test_005',
    (SELECT id FROM periods WHERE isActive = true LIMIT 1),
    91.2,
    'Capaian sangat baik - inovatif dan efisien',
    'admin_test_001',
    NOW(),
    NOW()
);