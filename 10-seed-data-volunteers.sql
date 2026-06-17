-- =============================================================================
-- NEXUS-AID — 10-seed-data-volunteers.sql
-- 4 scenarios × 30 volunteers + 12 local committees + extended profiles
-- Passwords: Test@1234! => BCrypt hash below
-- BCrypt of 'Test@1234!': $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.
-- NOTE: Using existing bcrypt from schema for simplicity: pass = 'pass'
-- $2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO
-- For Test@1234!: $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewSoAVnNDwByGdFi
-- =============================================================================
\c nexusaiddb;

-- ─── ADDITIONAL LOCAL COMMITTEES (12 new) ────────────────────────────────────
INSERT INTO committees (id, name, type, region, parent_committee_id, status, approved_at, current_mandate_start, current_mandate_end) VALUES
('c0000000-0000-0000-0000-000000000010','Comité Local de Carthage',       'LOCAL','Carthage',        'b0000000-0000-0000-0000-000000000001','ACTIVE','2021-01-01','2025-01-01','2029-01-01'),
('c0000000-0000-0000-0000-000000000011','Comité Local de Manouba',        'LOCAL','Manouba',         'b0000000-0000-0000-0000-000000000001','ACTIVE','2022-03-01','2026-03-01','2030-03-01'),
('c0000000-0000-0000-0000-000000000012','Comité Local de Nabeul-Ville',   'LOCAL','Nabeul-Ville',    'b0000000-0000-0000-0000-000000000006','ACTIVE','2020-06-01','2024-06-01','2028-06-01'),
('c0000000-0000-0000-0000-000000000013','Comité Local de Hammamet',       'LOCAL','Hammamet',        'b0000000-0000-0000-0000-000000000006','ACTIVE','2021-09-01','2025-09-01','2029-09-01'),
('c0000000-0000-0000-0000-000000000014','Comité Local de Kélibia',        'LOCAL','Kélibia',         'b0000000-0000-0000-0000-000000000006','ACTIVE','2023-01-01','2023-01-01','2027-01-01'),
('c0000000-0000-0000-0000-000000000015','Comité Local de Kairouan-Sud',   'LOCAL','Kairouan-Sud',    'b0000000-0000-0000-0000-000000000007','ACTIVE','2022-05-01','2022-05-01','2026-05-01'),
('c0000000-0000-0000-0000-000000000016','Comité Local de Sbikha',         'LOCAL','Sbikha',          'b0000000-0000-0000-0000-000000000007','ACTIVE','2023-08-01','2023-08-01','2027-08-01'),
('c0000000-0000-0000-0000-000000000017','Comité Local de Menzel Jemil',   'LOCAL','Menzel Jemil',    'b0000000-0000-0000-0000-000000000004','ACTIVE','2021-11-01','2025-11-01','2029-11-01'),
('c0000000-0000-0000-0000-000000000018','Comité Local de Sfax-Médina',    'LOCAL','Sfax-Médina',     'b0000000-0000-0000-0000-000000000003','ACTIVE','2022-02-01','2022-02-01','2026-02-01'),
('c0000000-0000-0000-0000-000000000019','Comité Local de El Aïn',         'LOCAL','El Aïn',          'b0000000-0000-0000-0000-000000000002','ACTIVE','2023-04-01','2023-04-01','2027-04-01'),
('c0000000-0000-0000-0000-000000000020','Comité Local de Korba',          'LOCAL','Korba',           'b0000000-0000-0000-0000-000000000006','PENDING_CONSTITUTION',NULL,NULL,NULL),
('c0000000-0000-0000-0000-000000000021','Comité Local de Moknine',        'LOCAL','Moknine',         'b0000000-0000-0000-0000-000000000008','PENDING_CONSTITUTION',NULL,NULL,NULL)
ON CONFLICT (type, region) DO NOTHING;

-- ─── SCENARIO 1: 30 Volunteers APPROVED + Profile Completed ─────────────────
-- BCrypt hash for 'Test@1234!' (cost 10)
-- Using: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyZrKkKm2

DO $$
DECLARE
  pw TEXT := '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO';
  committees UUID[] := ARRAY[
    'c0000000-0000-0000-0000-000000000001'::UUID,
    'c0000000-0000-0000-0000-000000000002'::UUID,
    'c0000000-0000-0000-0000-000000000003'::UUID,
    'c0000000-0000-0000-0000-000000000004'::UUID,
    'c0000000-0000-0000-0000-000000000005'::UUID,
    'c0000000-0000-0000-0000-000000000010'::UUID
  ];
  names TEXT[] := ARRAY[
    'Amine Bouchnak','Sarra Mzoughi','Bilel Haddad','Nour Ben Khalifa','Khaled Ayari',
    'Rim Dridi','Tarek Jouini','Asma Jemli','Youssef Chaabouni','Meriem Rekik',
    'Firas Ouali','Haifa Toumi','Skander Ben Othman','Ines Chabbi','Malek Hamdi',
    'Donia Bejaoui','Wael Mansouri','Leila Grissa','Montassar Amdouni','Salma Karray',
    'Ayoub Tlili','Hela Bouaziz','Chedi Sfar','Marwa Belhadj','Rafik Gargouri',
    'Fatma Zouaghi','Seif Hizem','Sabrina Trabelsi','Ramzi Ben Hassen','Nadia Ferchichi'
  ];
  i INT;
  uid UUID;
  cin_val TEXT;
  email_val TEXT;
  mat_val TEXT;
  edu_levels TEXT[] := ARRAY['BAC','LICENCE','MASTER','BAC_PLUS_1_2','DOCTORAT','LICENCE'];
  domains TEXT[] := ARRAY['Médecine','Informatique','Droit','Sciences','Gestion','Éducation','Ingénierie','Psychologie','Communication','Biologie'];
BEGIN
  FOR i IN 1..30 LOOP
    uid := gen_random_uuid();
    cin_val := LPAD((60100000 + i)::TEXT, 8, '0');
    email_val := 'volontaire.s1.' || i || '@crt.tn';
    mat_val := '66T-S1-' || LPAD(i::TEXT, 4, '0');

    -- User
    INSERT INTO users (id, email, password, full_name, cin, phone, user_type, account_status, birth_date, first_login_completed)
    VALUES (uid, email_val, pw, names[i], cin_val,
            '+2169' || LPAD((8200000 + i)::TEXT, 7, '0'),
            'VOLUNTEER', 'APPROVED',
            ('1990-01-01'::DATE + ((i * 97) || ' days')::INTERVAL)::DATE,
            TRUE)
    ON CONFLICT DO NOTHING;

    -- Volunteer
    INSERT INTO volunteers (id, matricule, committee_id, date_adhesion, hours_volunteered, gouvernorat)
    VALUES (uid, mat_val,
            committees[((i-1) % array_length(committees,1)) + 1],
            ('2022-01-01'::DATE + ((i * 11) || ' days')::INTERVAL)::DATE,
            (50 + i * 12)::DECIMAL,
            CASE ((i-1) % 6)
              WHEN 0 THEN 'Tunis' WHEN 1 THEN 'Ariana'
              WHEN 2 THEN 'La Marsa' WHEN 3 THEN 'Ben Arous'
              WHEN 4 THEN 'Hammam Sousse' ELSE 'Carthage'
            END)
    ON CONFLICT DO NOTHING;

    -- Extended Profile (completed)
    INSERT INTO volunteer_extended_profiles (
      volunteer_id, phone, emergency_contact_name, emergency_contact_phone,
      emergency_contact_relation, education_level, specialization_domain,
      training_courses_attended, real_integration_date, other_skills,
      profile_completed, profile_completion_score, submitted_at, reviewed_at
    ) VALUES (
      uid,
      '+2169' || LPAD((8200000 + i)::TEXT, 7, '0'),
      'Contact Urgence ' || names[i],
      '+2169' || LPAD((9200000 + i)::TEXT, 7, '0'),
      CASE (i % 4) WHEN 0 THEN 'Père' WHEN 1 THEN 'Mère' WHEN 2 THEN 'Époux/Épouse' ELSE 'Frère/Sœur' END,
      edu_levels[((i-1) % array_length(edu_levels,1)) + 1]::education_level,
      domains[((i-1) % array_length(domains,1)) + 1],
      '["PSC1","Formation premiers secours ' || i || '"]',
      ('2022-01-15'::DATE + ((i * 11) || ' days')::INTERVAL)::DATE,
      'Conduite,Langues étrangères,Travail en équipe',
      TRUE, 100, NOW() - ((i * 3) || ' days')::INTERVAL, NOW() - ((i * 2) || ' days')::INTERVAL
    ) ON CONFLICT (volunteer_id) DO NOTHING;
  END LOOP;
END $$;

-- ─── SCENARIO 2: 30 Volunteers APPROVED but Profile NOT Completed ────────────
DO $$
DECLARE
  pw TEXT := '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO';
  committees UUID[] := ARRAY[
    'c0000000-0000-0000-0000-000000000005'::UUID,
    'c0000000-0000-0000-0000-000000000006'::UUID,
    'c0000000-0000-0000-0000-000000000007'::UUID,
    'c0000000-0000-0000-0000-000000000012'::UUID,
    'c0000000-0000-0000-0000-000000000013'::UUID,
    'c0000000-0000-0000-0000-000000000015'::UUID
  ];
  names TEXT[] := ARRAY[
    'Zied Abdallah','Ons Hamrouni','Mehdi Kessentini','Yosra Gasmi','Nizar Fakhfakh',
    'Abir Haj Salem','Mourad Ben Amor','Sirine Jebari','Ghassen Khediri','Emna Arbi',
    'Lotfi Chaari','Dalel Riahi','Hassen Mhimdi','Amira Zghal','Sofiene Ellouze',
    'Ines Hakim','Badreddine Mejri','Wifek Stambouli','Karim Jemail','Rania Bouktila',
    'Hedi Ghannem','Sonia Kasraoui','Foued Mabrouk','Najeh Baccouche','Asma Chaker',
    'Slim Ben Hassine','Olfa Melki','Tarak Messaoudi','Hana Ghribi','Wissem Dridi'
  ];
  i INT;
  uid UUID;
BEGIN
  FOR i IN 1..30 LOOP
    uid := gen_random_uuid();

    INSERT INTO users (id, email, password, full_name, cin, phone, user_type, account_status, birth_date, first_login_completed)
    VALUES (uid,
            'volontaire.s2.' || i || '@crt.tn', pw, names[i],
            LPAD((61100000 + i)::TEXT, 8, '0'),
            '+2169' || LPAD((8300000 + i)::TEXT, 7, '0'),
            'VOLUNTEER', 'APPROVED',
            ('1988-06-01'::DATE + ((i * 73) || ' days')::INTERVAL)::DATE,
            FALSE)
    ON CONFLICT DO NOTHING;

    INSERT INTO volunteers (id, matricule, committee_id, date_adhesion, hours_volunteered, gouvernorat)
    VALUES (uid,
            '66T-S2-' || LPAD(i::TEXT, 4, '0'),
            committees[((i-1) % array_length(committees,1)) + 1],
            ('2023-06-01'::DATE + ((i * 7) || ' days')::INTERVAL)::DATE,
            (5 + i * 2)::DECIMAL,
            CASE ((i-1) % 6) WHEN 0 THEN 'Sousse' WHEN 1 THEN 'Msaken'
              WHEN 2 THEN 'Sakiet Ezzit' WHEN 3 THEN 'Nabeul-Ville'
              WHEN 4 THEN 'Hammamet' ELSE 'Kairouan-Sud' END)
    ON CONFLICT DO NOTHING;

    -- Minimal/incomplete extended profile (not completed)
    INSERT INTO volunteer_extended_profiles (
      volunteer_id, profile_completed, profile_completion_score
    ) VALUES (uid, FALSE, ((i * 3) % 60))
    ON CONFLICT (volunteer_id) DO NOTHING;
  END LOOP;
END $$;

-- ─── SCENARIO 3: 30 Volunteers PENDING (waiting approval) ───────────────────
DO $$
DECLARE
  pw TEXT := '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO';
  committees UUID[] := ARRAY[
    'b0000000-0000-0000-0000-000000000002'::UUID,
    'b0000000-0000-0000-0000-000000000003'::UUID,
    'c0000000-0000-0000-0000-000000000009'::UUID,
    'c0000000-0000-0000-0000-000000000016'::UUID,
    'c0000000-0000-0000-0000-000000000017'::UUID,
    'c0000000-0000-0000-0000-000000000018'::UUID
  ];
  names TEXT[] := ARRAY[
    'Ahmed Ouerfelli','Sana Bouslama','Riadh Ben Fredj','Imen Ghariani','Majdi Karray',
    'Fatma Daly','Chaker Ben Rhouma','Narjes Smida','Hatem Slimani','Cyrine Fersi',
    'Ramzi Khalfaoui','Semia Ben Ali','Walid Chaouachi','Dorsaf Lazhar','Samir Mrad',
    'Hela Gaied','Chokri Khedher','Sana Haouari','Fethi Jarray','Ines Abdellatif',
    'Houssem Chouchane','Manel Trabelsi','Ziad Hammouda','Amel Gaaliche','Saber Ben Said',
    'Ghada Bali','Tahar Chaabane','Saoussen Mzoughi','Bilel Khouja','Rahma Ben Youssef'
  ];
  i INT;
  uid UUID;
BEGIN
  FOR i IN 1..30 LOOP
    uid := gen_random_uuid();

    INSERT INTO users (id, email, password, full_name, cin, phone, user_type, account_status, birth_date, first_login_completed)
    VALUES (uid,
            'volontaire.s3.' || i || '@crt.tn', pw, names[i],
            LPAD((62100000 + i)::TEXT, 8, '0'),
            '+2169' || LPAD((8400000 + i)::TEXT, 7, '0'),
            'VOLUNTEER', 'PENDING',
            ('1995-03-01'::DATE + ((i * 41) || ' days')::INTERVAL)::DATE,
            FALSE)
    ON CONFLICT DO NOTHING;

    INSERT INTO volunteers (id, matricule, committee_id, date_adhesion, hours_volunteered, gouvernorat)
    VALUES (uid,
            '66T-S3-' || LPAD(i::TEXT, 4, '0'),
            committees[((i-1) % array_length(committees,1)) + 1],
            NOW()::DATE,
            0,
            CASE ((i-1) % 6) WHEN 0 THEN 'Sousse' WHEN 1 THEN 'Sfax'
              WHEN 2 THEN 'Menzel Bourguiba' WHEN 3 THEN 'Sbikha'
              WHEN 4 THEN 'Menzel Jemil' ELSE 'Sfax-Médina' END)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ─── SCENARIO 4: 30 Multi-certified Volunteers ───────────────────────────────
DO $$
DECLARE
  pw TEXT := '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO';
  committees UUID[] := ARRAY[
    'a0000000-0000-0000-0000-000000000001'::UUID,
    'b0000000-0000-0000-0000-000000000001'::UUID,
    'b0000000-0000-0000-0000-000000000002'::UUID,
    'c0000000-0000-0000-0000-000000000001'::UUID,
    'c0000000-0000-0000-0000-000000000003'::UUID,
    'c0000000-0000-0000-0000-000000000011'::UUID
  ];
  names TEXT[] := ARRAY[
    'Dr. Sami Khelifi','Dr. Amel Jrad','Lotfi Bel Haj','Dr. Nadia Oueslati','Khaled Bettaieb',
    'Dr. Mariem Chaker','Anis Jebali','Dr. Sonia Ben Mahmoud','Hedi Riahi','Dr. Olfa Hamdi',
    'Tarek Abidi','Dr. Imen Chaari','Raouf Saafi','Dr. Hajer Sfar','Walid Ben Slimane',
    'Dr. Sihem Hmidi','Fares Chiha','Dr. Asma Karray','Malek Dhafer','Dr. Cyrine Lahmar',
    'Nidhal Ghodbane','Dr. Wafa Mzoughi','Samir Boughedir','Dr. Leila Hamza','Bassem Tounsi',
    'Dr. Randa Ayari','Karim Jendoubi','Dr. Myriam Ben Salem','Sofiane Chakroun','Dr. Amira Chabaane'
  ];
  i INT;
  uid UUID;
  cert_ids UUID[];
  c INT;
BEGIN
  -- Get certification IDs
  SELECT ARRAY_AGG(id) INTO cert_ids FROM secourisme_certifications WHERE is_active = TRUE;

  FOR i IN 1..30 LOOP
    uid := gen_random_uuid();

    INSERT INTO users (id, email, password, full_name, cin, phone, user_type, account_status, birth_date, first_login_completed)
    VALUES (uid,
            'volontaire.s4.' || i || '@crt.tn', pw, names[i],
            LPAD((63100000 + i)::TEXT, 8, '0'),
            '+2169' || LPAD((8500000 + i)::TEXT, 7, '0'),
            'VOLUNTEER', 'APPROVED',
            ('1985-01-01'::DATE + ((i * 53) || ' days')::INTERVAL)::DATE,
            TRUE)
    ON CONFLICT DO NOTHING;

    INSERT INTO volunteers (id, matricule, committee_id, date_adhesion, hours_volunteered, gouvernorat)
    VALUES (uid,
            '66T-S4-' || LPAD(i::TEXT, 4, '0'),
            committees[((i-1) % array_length(committees,1)) + 1],
            ('2018-01-01'::DATE + ((i * 15) || ' days')::INTERVAL)::DATE,
            (200 + i * 30)::DECIMAL,
            'Tunis')
    ON CONFLICT DO NOTHING;

    -- Extended Profile (completed)
    INSERT INTO volunteer_extended_profiles (
      volunteer_id, phone, emergency_contact_name, emergency_contact_phone,
      emergency_contact_relation, education_level, specialization_domain,
      training_courses_attended, real_integration_date, other_skills,
      profile_completed, profile_completion_score, submitted_at, reviewed_at
    ) VALUES (
      uid,
      '+2169' || LPAD((8500000 + i)::TEXT, 7, '0'),
      'Contact S4-' || i,
      '+2169' || LPAD((9500000 + i)::TEXT, 7, '0'),
      'Conjoint(e)',
      'MASTER'::education_level,
      'Médecine d''urgence et secourisme avancé',
      '["PSC1","PSE1","PSE2","PHTLS","TRIAGE MRRU","Formation Formateur"]',
      ('2018-02-01'::DATE + ((i * 15) || ' days')::INTERVAL)::DATE,
      'Leadership,Formation,Enseignement,Langues,Gestion de crise',
      TRUE, 100, NOW() - ((i * 5) || ' days')::INTERVAL, NOW() - ((i * 3) || ' days')::INTERVAL
    ) ON CONFLICT (volunteer_id) DO NOTHING;

    -- Add multiple certifications (2-4 per volunteer)
    IF cert_ids IS NOT NULL AND array_length(cert_ids,1) >= 2 THEN
      FOR c IN 1..LEAST(i % 4 + 2, array_length(cert_ids,1)) LOOP
        INSERT INTO volunteer_certifications (
          volunteer_id, certification_id, date_obtained, date_expiry,
          issued_by, status
        ) VALUES (
          uid,
          cert_ids[c],
          ('2019-01-01'::DATE + ((c * 180) || ' days')::INTERVAL)::DATE,
          ('2023-01-01'::DATE + ((c * 180) || ' days')::INTERVAL)::DATE,
          'CRT National',
          CASE WHEN ('2023-01-01'::DATE + ((c * 180) || ' days')::INTERVAL)::DATE < NOW()::DATE
               THEN 'EXPIRED' ELSE 'ACTIVE' END
        ) ON CONFLICT (volunteer_id, certification_id) DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- ─── EXTENDED PROFILES for existing approved volunteers ──────────────────────
INSERT INTO volunteer_extended_profiles (
  volunteer_id, phone, emergency_contact_name, emergency_contact_phone,
  emergency_contact_relation, education_level, specialization_domain,
  training_courses_attended, real_integration_date, other_skills,
  profile_completed, profile_completion_score, submitted_at, reviewed_at
) VALUES
('40000000-0000-0000-0000-000000000001','+21698201001','Sghaier Père','+21671900001','Père','BAC_PLUS_1_2'::education_level,'Secourisme','["PSE1","PSE2","RCP"]','2019-09-01','Permis de conduire,Anglais',TRUE,95,NOW()-'5 days'::INTERVAL,NOW()-'3 days'::INTERVAL),
('40000000-0000-0000-0000-000000000002','+21622202002','Hadj Tahar Mère','+21671900002','Mère','DOCTORAT'::education_level,'Médecine générale','["Médecine urgence","RCP"]','2020-01-15','Chirurgie mineure,Pédiatrie',TRUE,100,NOW()-'10 days'::INTERVAL,NOW()-'7 days'::INTERVAL)
ON CONFLICT (volunteer_id) DO NOTHING;

-- ─── VOLUNTEER CERTIFICATIONS for existing volunteers ────────────────────────
INSERT INTO volunteer_certifications (volunteer_id, certification_id, date_obtained, date_expiry, issued_by, status)
SELECT '40000000-0000-0000-0000-000000000001', id, '2020-05-10', '2024-05-10', 'CRT Bardo', 'EXPIRED'
FROM secourisme_certifications WHERE code = 'PSC1'
ON CONFLICT DO NOTHING;

INSERT INTO volunteer_certifications (volunteer_id, certification_id, date_obtained, date_expiry, issued_by, status)
SELECT '40000000-0000-0000-0000-000000000001', id, '2020-05-10', '2024-05-10', 'CRT Bardo', 'EXPIRED'
FROM secourisme_certifications WHERE code = 'PSE1'
ON CONFLICT DO NOTHING;

INSERT INTO volunteer_certifications (volunteer_id, certification_id, date_obtained, date_expiry, issued_by, status)
SELECT '40000000-0000-0000-0000-000000000002', id, '2014-07-01', NULL, 'Faculté Médecine Sfax', 'ACTIVE'
FROM secourisme_certifications WHERE code = 'PSE2'
ON CONFLICT DO NOTHING;
