-- Sample Attendance Data for Testing
-- Covers various scenarios including perfect, good, and problematic attendance

-- Perfect attendance (staff1)
INSERT INTO attendance (
    id, userId, periodId, persentaseTotal,
    adaTidakKerja, adaPulangAwal, adaTelat, adaAbsenApel, adaCuti,
    jumlahTidakKerja, jumlahPulangAwal, jumlahTelat, jumlahAbsenApel, jumlahCuti,
    penguranganTK, penguranganPSW, penguranganTLT, penguranganAPEL, penguranganCT,
    totalMinus, nilaiPresensi, keterangan, inputBy, createdAt, updatedAt
) VALUES (
    'att_test_001',
    'staff_test_001',
    (SELECT id FROM periods WHERE isActive = true LIMIT 1),
    100.0,
    false, false, false, false, false,
    0, 0, 0, 0, 0,
    0.0, 0.0, 0.0, 0.0, 0.0,
    0.0, 100.0,
    'Attendance perfect - tidak ada masalah',
    'admin_test_001',
    NOW(),
    NOW()
);

-- Good attendance with minor issues (staff2)
INSERT INTO attendance (
    id, userId, periodId, persentaseTotal,
    adaTidakKerja, adaPulangAwal, adaTelat, adaAbsenApel, adaCuti,
    jumlahTidakKerja, jumlahPulangAwal, jumlahTelat, jumlahAbsenApel, jumlahCuti,
    penguranganTK, penguranganPSW, penguranganTLT, penguranganAPEL, penguranganCT,
    totalMinus, nilaiPresensi, keterangan, inputBy, createdAt, updatedAt
) VALUES (
    'att_test_002',
    'staff_test_002',
    (SELECT id FROM periods WHERE isActive = true LIMIT 1),
    100.0,
    false, false, true, true, false,
    0, 0, 2, 1, 0,
    0.0, 0.0, 5.0, 5.0, 0.0,
    10.0, 90.0,
    'Telat 2 kali, absen apel 1 kali',
    'admin_test_001',
    NOW(),
    NOW()
);

-- Problematic attendance (staff3)
INSERT INTO attendance (
    id, userId, periodId, persentaseTotal,
    adaTidakKerja, adaPulangAwal, adaTelat, adaAbsenApel, adaCuti,
    jumlahTidakKerja, jumlahPulangAwal, jumlahTelat, jumlahAbsenApel, jumlahCuti,
    penguranganTK, penguranganPSW, penguranganTLT, penguranganAPEL, penguranganCT,
    totalMinus, nilaiPresensi, keterangan, inputBy, createdAt, updatedAt
) VALUES (
    'att_test_003',
    'staff_test_003',
    (SELECT id FROM periods WHERE isActive = true LIMIT 1),
    100.0,
    true, true, true, true, true,
    1, 3, 4, 2, 1,
    15.0, 10.0, 10.0, 10.0, 5.0,
    50.0, 50.0,
    'Banyak masalah: TK 1x, PSW 3x, Telat 4x, Absen Apel 2x, Cuti 1x',
    'admin_test_001',
    NOW(),
    NOW()
);

-- Average attendance (staff4)
INSERT INTO attendance (
    id, userId, periodId, persentaseTotal,
    adaTidakKerja, adaPulangAwal, adaTelat, adaAbsenApel, adaCuti,
    jumlahTidakKerja, jumlahPulangAwal, jumlahTelat, jumlahAbsenApel, jumlahCuti,
    penguranganTK, penguranganPSW, penguranganTLT, penguranganAPEL, penguranganCT,
    totalMinus, nilaiPresensi, keterangan, inputBy, createdAt, updatedAt
) VALUES (
    'att_test_004',
    'staff_test_004',
    (SELECT id FROM periods WHERE isActive = true LIMIT 1),
    100.0,
    false, true, true, false, true,
    0, 1, 1, 0, 1,
    0.0, 5.0, 5.0, 0.0, 5.0,
    15.0, 85.0,
    'PSW 1x, Telat 1x, Cuti 1x',
    'admin_test_001',
    NOW(),
    NOW()
);

-- Good attendance (staff5)
INSERT INTO attendance (
    id, userId, periodId, persentaseTotal,
    adaTidakKerja, adaPulangAwal, adaTelat, adaAbsenApel, adaCuti,
    jumlahTidakKerja, jumlahPulangAwal, jumlahTelat, jumlahAbsenApel, jumlahCuti,
    penguranganTK, penguranganPSW, penguranganTLT, penguranganAPEL, penguranganCT,
    totalMinus, nilaiPresensi, keterangan, inputBy, createdAt, updatedAt
) VALUES (
    'att_test_005',
    'staff_test_005',
    (SELECT id FROM periods WHERE isActive = true LIMIT 1),
    100.0,
    false, false, true, false, false,
    0, 0, 1, 0, 0,
    0.0, 0.0, 5.0, 0.0, 0.0,
    5.0, 95.0,
    'Hanya telat 1 kali',
    'admin_test_001',
    NOW(),
    NOW()
);