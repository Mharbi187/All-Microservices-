-- NEXUS-AID — Seeding more realistic simulation data for Youth module
\c nexusaiddb;

DO $$
DECLARE
  nat_comm_id UUID;
  tunis_comm_id UUID;
  sousse_comm_id UUID;
  sfax_comm_id UUID;
  msaken_comm_id UUID;
  ariana_comm_id UUID;

  pw TEXT := '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO'; -- 'pass'

  -- Volunteers
  u_id UUID;
  v_comm_id UUID;
  birth_d DATE;
  v_hours DOUBLE PRECISION;
  v_name TEXT;

  -- Iteration variables
  i INT;
  temp_id UUID;
  tmpl_id UUID;
  form_id UUID;
  proj_id UUID;
  rec_id UUID;
  resp_id UUID;
  
  -- Array of committee IDs to distribute volunteers
  comm_ids UUID[];
  names TEXT[] := ARRAY[
    'Malek Touati', 'Rania Kahloul', 'Fedi Ben Amor', 'Emna Ghorbel', 
    'Jihed Dridi', 'Marwa Selmi', 'Oussema Jelassi', 'Farah Boussetta', 
    'Anis Cherif', 'Siwar Nafti', 'Hamza Chaabane', 'Yasmine Rezgui'
  ];
  birthdays DATE[] := ARRAY[
    '2003-04-10'::DATE, '2005-08-22'::DATE, '2007-11-15'::DATE, '2002-01-30'::DATE,
    '2004-06-05'::DATE, '2006-09-12'::DATE, '2008-03-25'::DATE, '2001-10-02'::DATE,
    '1999-12-18'::DATE, '2005-02-14'::DATE, '2000-07-28'::DATE, '2003-05-19'::DATE
  ];
  hours_v DOUBLE PRECISION[] := ARRAY[
    145.5, 92.0, 15.0, 120.0, 60.5, 8.0, 22.0, 110.0, 195.0, 34.0, 88.5, 5.0
  ];
  gouvernorats TEXT[] := ARRAY[
    'Tunis', 'Sousse', 'Sfax', 'Sousse', 'Tunis', 'Sfax', 'Tunis', 'Sousse', 
    'Tunis', 'Sfax', 'Sousse', 'Tunis'
  ];

  -- Themes & categories
  themes TEXT[] := ARRAY['ENVIRONNEMENT', 'CITOYENNETE', 'SANTE', 'EDUCATION', 'CULTURE', 'SPORT'];
  skills TEXT[][] := ARRAY[
    ARRAY['Secourisme', 'Logistique'],
    ARRAY['Communication', 'Animation'],
    ARRAY['Secourisme', 'Formation'],
    ARRAY['Numérique', 'Design'],
    ARRAY['Logistique', 'Planification'],
    ARRAY['Animation', 'Secourisme'],
    ARRAY['Secourisme', 'Planification'],
    ARRAY['Communication', 'Numérique'],
    ARRAY['Formation', 'Leadership'],
    ARRAY['Logistique', 'Animation'],
    ARRAY['Secourisme', 'Leadership'],
    ARRAY['Communication', 'Animation']
  ];
BEGIN
  -- 1. Fetch real committee IDs
  SELECT id INTO nat_comm_id FROM committees WHERE type = 'NATIONAL' LIMIT 1;
  SELECT id INTO tunis_comm_id FROM committees WHERE type = 'REGIONAL' AND region = 'Tunis' LIMIT 1;
  SELECT id INTO sousse_comm_id FROM committees WHERE type = 'REGIONAL' AND region = 'Sousse' LIMIT 1;
  SELECT id INTO sfax_comm_id FROM committees WHERE type = 'REGIONAL' AND region = 'Sfax' LIMIT 1;
  SELECT id INTO msaken_comm_id FROM committees WHERE type = 'LOCAL' AND region = 'Msaken' LIMIT 1;
  SELECT id INTO ariana_comm_id FROM committees WHERE type = 'LOCAL' AND region = 'Ariana' LIMIT 1;

  comm_ids := ARRAY[tunis_comm_id, sousse_comm_id, sfax_comm_id, msaken_comm_id, ariana_comm_id];

  -- 2. Insert Volunteers (12 volunteers with diverse properties)
  FOR i IN 1..12 LOOP
    u_id := CAST('81000000-0000-0000-0000-0000000000' || LPAD(i::text, 2, '0') AS UUID);
    v_comm_id := comm_ids[(i % 5) + 1];
    
    INSERT INTO users (id, email, password, full_name, cin, phone, birth_date, user_type, account_status, first_login_completed)
    VALUES (
      u_id, 
      'volontaire.simulation' || i || '@crt.tn', 
      pw, 
      names[i], 
      '08' || LPAD((i*111)::text, 6, '0'), 
      '+21699' || LPAD((i*10000)::text, 6, '0'), 
      birthdays[i], 
      'VOLUNTEER', 
      'APPROVED', 
      TRUE
    ) ON CONFLICT (email) DO NOTHING;

    INSERT INTO volunteers (id, matricule, committee_id, date_adhesion, hours_volunteered, gouvernorat)
    VALUES (
      u_id, 
      'MAT-SIM-' || LPAD(i::text, 3, '0'), 
      v_comm_id, 
      NOW() - INTERVAL '1 year' - (i * INTERVAL '15 days'), 
      hours_v[i], 
      gouvernorats[i]
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- 3. Insert Form Templates (12 templates)
  FOR i IN 1..12 LOOP
    tmpl_id := CAST('91000000-0000-0000-0000-0000000000' || LPAD(i::text, 2, '0') AS UUID);
    v_comm_id := comm_ids[(i % 5) + 1];
    
    INSERT INTO youth_form_templates (id, committee_id, created_at, description, questions, target_level, title, status)
    VALUES (
      tmpl_id,
      CASE WHEN i <= 3 THEN 'ALL' ELSE CAST(v_comm_id AS VARCHAR) END,
      NOW() - (i * INTERVAL '10 days'),
      'Template de formulaire simulation #' || i || ' pour évaluation dynamique.',
      '[{"id": "q1", "type": "TEXT", "label": "Vos motivations principales", "required": true}, {"id": "q2", "type": "RATING", "label": "Évaluation personnelle", "required": false}]',
      CASE WHEN i <= 3 THEN 'GLOBAL' WHEN i <= 7 THEN 'REGIONAL' ELSE 'LOCAL' END,
      'Formulaire Simulation Jeunesse ' || i,
      CASE WHEN i % 3 = 0 THEN 'PENDING_VALIDATION' WHEN i % 3 = 1 THEN 'APPROVED' ELSE 'REJECTED' END
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- 4. Insert Youth Integration Forms (12 forms)
  FOR i IN 1..12 LOOP
    form_id := CAST('a1000000-0000-0000-0000-0000000000' || LPAD(i::text, 2, '0') AS UUID);
    u_id := CAST('81000000-0000-0000-0000-0000000000' || LPAD(i::text, 2, '0') AS UUID);
    
    INSERT INTO youth_integration_forms (id, volunteer_id, aspirations, skills, aptitudes, interest_areas, submitted_at)
    VALUES (
      form_id,
      u_id,
      to_jsonb(ARRAY['Aider la communauté', 'Acquérir des compétences']),
      to_jsonb(skills[i]),
      to_jsonb(ARRAY['Esprit d''équipe', 'Autonomie']),
      to_jsonb(ARRAY[themes[(i % 6) + 1]]),
      NOW() - (i * INTERVAL '8 days')
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- 5. Insert Youth Recommendations (12 recommendations)
  FOR i IN 1..12 LOOP
    rec_id := CAST('b1000000-0000-0000-0000-0000000000' || LPAD(i::text, 2, '0') AS UUID);
    form_id := CAST('a1000000-0000-0000-0000-0000000000' || LPAD(i::text, 2, '0') AS UUID);
    v_comm_id := comm_ids[(i % 5) + 1];
    
    INSERT INTO youth_recommendations (id, category, confidence_score, date_creation, description, form_id, generated_at, priority, recommended_missions, recommended_training_ia, status, target, title, committee_id)
    VALUES (
      rec_id,
      CASE WHEN i % 3 = 0 THEN 'Secourisme' WHEN i % 3 = 1 THEN 'Climat' ELSE 'Santé' END,
      0.75 + (i * 0.02),
      NOW() - (i * INTERVAL '12 days'),
      'Description de recommandation IA #' || i || ' basée sur le profil du volontaire.',
      form_id,
      NOW() - (i * INTERVAL '12 days'),
      CASE WHEN i % 3 = 0 THEN 'ELEVEE' WHEN i % 3 = 1 THEN 'MOYENNE' ELSE 'BASSE' END,
      to_jsonb(ARRAY['Mission Secouriste de terrain #' || i]),
      to_jsonb(ARRAY['Formation Premier Secours #' || i]),
      CASE WHEN i % 4 = 0 THEN 'PENDING_VALIDATION' ELSE 'APPROVED' END,
      CASE WHEN i % 3 = 0 THEN 'NATIONAL' WHEN i % 3 = 1 THEN 'REGIONAL' ELSE 'LOCAL' END,
      'Recommandation Simulation ' || i,
      v_comm_id
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- 6. Insert Micro Projects (12 projects)
  FOR i IN 1..12 LOOP
    proj_id := CAST('c1000000-0000-0000-0000-0000000000' || LPAD(i::text, 2, '0') AS UUID);
    u_id := CAST('81000000-0000-0000-0000-0000000000' || LPAD(i::text, 2, '0') AS UUID);
    v_comm_id := comm_ids[(i % 5) + 1];
    
    INSERT INTO micro_projects (id, description, end_date, lead_volunteer_id, participants, results, start_date, status, theme, title, committee_id)
    VALUES (
      proj_id,
      'Description détaillée du projet simulation #' || i || ' visant à impacter la jeunesse locale.',
      (NOW() + INTERVAL '3 months')::DATE,
      u_id,
      NULL,
      NULL,
      (NOW() - INTERVAL '5 days')::DATE,
      CASE WHEN i % 3 = 0 THEN 'PENDING_VALIDATION' WHEN i % 3 = 1 THEN 'APPROVED' ELSE 'ACTIVE' END,
      themes[(i % 6) + 1],
      'Micro-Projet Jeunesse ' || i,
      v_comm_id
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- 7. Insert Form Responses (12 responses)
  FOR i IN 1..12 LOOP
    resp_id := CAST('d1000000-0000-0000-0000-0000000000' || LPAD(i::text, 2, '0') AS UUID);
    tmpl_id := CAST('91000000-0000-0000-0000-0000000000' || LPAD(i::text, 2, '0') AS UUID);
    u_id := CAST('81000000-0000-0000-0000-0000000000' || LPAD(i::text, 2, '0') AS UUID);
    
    INSERT INTO youth_form_responses (id, id_form_template, id_volunteer, responses, submitted_at)
    VALUES (
      resp_id,
      tmpl_id,
      u_id,
      CAST('{"q1": "Motivation simulation #' || i || '", "q2": ' || (3 + (i % 3)) || '}' AS jsonb),
      NOW() - (i * INTERVAL '5 days')
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

END $$;
