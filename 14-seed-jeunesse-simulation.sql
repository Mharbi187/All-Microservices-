-- NEXUS-AID — Seeding youth simulation data (various Responsables Jeunesse and committees)
\c nexusaiddb;

DO $$
DECLARE
  nat_comm_id UUID;
  tunis_comm_id UUID;
  sousse_comm_id UUID;
  msaken_comm_id UUID;
  ariana_comm_id UUID;

  u_nat_id UUID := '70000000-0000-0000-0000-000000000001';
  u_tunis_id UUID := '70000000-0000-0000-0000-000000000002';
  u_sousse_id UUID := '70000000-0000-0000-0000-000000000003';
  u_msaken_id UUID := '70000000-0000-0000-0000-000000000004';
  
  -- Dummy Volunteers to submit responses
  v1_id UUID := '80000000-0000-0000-0000-000000000001';
  v2_id UUID := '80000000-0000-0000-0000-000000000002';
  v3_id UUID := '80000000-0000-0000-0000-000000000003';

  t1_id UUID := '90000000-0000-0000-0000-000000000001';
  t2_id UUID := '90000000-0000-0000-0000-000000000002';
  t3_id UUID := '90000000-0000-0000-0000-000000000003';

  pw TEXT := '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO'; -- 'pass'
BEGIN
  -- 1. Fetch real committee IDs
  SELECT id INTO nat_comm_id FROM committees WHERE type = 'NATIONAL' LIMIT 1;
  SELECT id INTO tunis_comm_id FROM committees WHERE type = 'REGIONAL' AND region = 'Tunis' LIMIT 1;
  SELECT id INTO sousse_comm_id FROM committees WHERE type = 'REGIONAL' AND region = 'Sousse' LIMIT 1;
  SELECT id INTO msaken_comm_id FROM committees WHERE type = 'LOCAL' AND region = 'Msaken' LIMIT 1;
  SELECT id INTO ariana_comm_id FROM committees WHERE type = 'LOCAL' AND region = 'Ariana' LIMIT 1;

  -- 2. Insert Users for Responsables Jeunesse
  INSERT INTO users (id, email, password, full_name, cin, phone, birth_date, user_type, account_status, first_login_completed) VALUES
    (u_nat_id, 'resp.jeunesse.nat.sim@crt.tn', pw, 'Amine Larbi (National Jeunesse)', '01111111', '+21698111222', '1988-03-15', 'VOLUNTEER', 'APPROVED', TRUE),
    (u_tunis_id, 'resp.jeunesse.tunis.sim@crt.tn', pw, 'Sana Riahi (Régional Tunis Jeunesse)', '02222222', '+21698222333', '1992-06-20', 'VOLUNTEER', 'APPROVED', TRUE),
    (u_sousse_id, 'resp.jeunesse.sousse@crt.tn', pw, 'Chiraz Selmi (Régional Sousse Jeunesse)', '03333333', '+21698333444', '1990-11-05', 'VOLUNTEER', 'APPROVED', TRUE),
    (u_msaken_id, 'resp.jeunesse.msaken@crt.tn', pw, 'Yassine Mejri (Local Msaken Jeunesse)', '04444444', '+21698444555', '1995-01-25', 'VOLUNTEER', 'APPROVED', TRUE)
  ON CONFLICT (email) DO NOTHING;

  -- 3. Insert Volunteers
  INSERT INTO volunteers (id, matricule, committee_id, date_adhesion, hours_volunteered, gouvernorat) VALUES
    (u_nat_id, '66T-NAT-JEU', nat_comm_id, '2020-01-01', 500, 'Tunis'),
    (u_tunis_id, '66T-TUN-JEU', tunis_comm_id, '2021-03-01', 320, 'Tunis'),
    (u_sousse_id, '66T-SOU-JEU', sousse_comm_id, '2021-06-01', 280, 'Sousse'),
    (u_msaken_id, '66T-MSK-JEU', msaken_comm_id, '2022-09-01', 120, 'Sousse')
  ON CONFLICT (id) DO NOTHING;

  -- 4. Assign Roles in committee_roles
  INSERT INTO committee_roles (id, title, committee_id, volunteer_id, status, assigned_at, created_at) VALUES
    (gen_random_uuid(), 'RESP_JEUNESSE', nat_comm_id, u_nat_id, 'APPROVED', NOW(), NOW()),
    (gen_random_uuid(), 'RESP_JEUNESSE', tunis_comm_id, u_tunis_id, 'APPROVED', NOW(), NOW()),
    (gen_random_uuid(), 'RESP_JEUNESSE', sousse_comm_id, u_sousse_id, 'APPROVED', NOW(), NOW()),
    (gen_random_uuid(), 'RESP_JEUNESSE', msaken_comm_id, u_msaken_id, 'APPROVED', NOW(), NOW())
  ON CONFLICT DO NOTHING;

  -- 5. Insert dummy volunteers who submit answers
  INSERT INTO users (id, email, password, full_name, cin, phone, birth_date, user_type, account_status) VALUES
    (v1_id, 'volontaire.tunis@crt.tn', pw, 'Bilel Tunis', '05555555', '+21695555555', '2004-05-12', 'VOLUNTEER', 'APPROVED'),
    (v2_id, 'volontaire.sousse@crt.tn', pw, 'Amel Sousse', '06666666', '+21696666666', '2005-09-18', 'VOLUNTEER', 'APPROVED'),
    (v3_id, 'volontaire.msaken@crt.tn', pw, 'Omar Msaken', '07777777', '+21697777777', '2008-01-30', 'VOLUNTEER', 'APPROVED')
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO volunteers (id, matricule, committee_id, date_adhesion, hours_volunteered, gouvernorat) VALUES
    (v1_id, 'MAT-VOL-TNS', tunis_comm_id, '2024-01-01', 12.5, 'Tunis'),
    (v2_id, 'MAT-VOL-SUS', sousse_comm_id, '2024-02-01', 45.0, 'Sousse'),
    (v3_id, 'MAT-VOL-MSK', msaken_comm_id, '2024-03-01', 8.0, 'Sousse')
  ON CONFLICT (id) DO NOTHING;

  -- 6. Insert Form Templates
  -- Template 1 (GLOBAL - APPROVED)
  INSERT INTO youth_form_templates (id, committee_id, created_at, description, questions, target_level, title, status) VALUES
    (t1_id, 'ALL', NOW(), 'Formulaire d''intégration des jeunes volontaires à l''échelle nationale.', 
     '[{"id": "q1", "type": "TEXT", "label": "Pourquoi voulez-vous rejoindre le Croissant Rouge ?", "required": true}, {"id": "q2", "type": "RATING", "label": "Notez votre intérêt pour l''action humanitaire", "required": false}, {"id": "q3", "type": "RADIO", "label": "Disponibilité", "options": ["Semaine", "Weekend", "Soirée"], "required": true}]',
     'GLOBAL', 'Intégration Nationale Jeunesse', 'APPROVED')
  ON CONFLICT (id) DO NOTHING;

  -- Template 2 (REGIONAL - PENDING_VALIDATION)
  INSERT INTO youth_form_templates (id, committee_id, created_at, description, questions, target_level, title, status) VALUES
    (t2_id, CAST(tunis_comm_id AS VARCHAR), NOW(), 'Évaluation des compétences écologiques pour Tunis.', 
     '[{"id": "q1", "type": "TEXT", "label": "Avez-vous de l''expérience en reforestation ?", "required": true}, {"id": "q2", "type": "BOOLEAN", "label": "Êtes-vous disponible pour des nettoyages de plage ?", "required": true}]',
     'REGIONAL', 'Formulaire Écologie Tunis', 'PENDING_VALIDATION')
  ON CONFLICT (id) DO NOTHING;

  -- Template 3 (LOCAL - APPROVED)
  INSERT INTO youth_form_templates (id, committee_id, created_at, description, questions, target_level, title, status) VALUES
    (t3_id, CAST(msaken_comm_id AS VARCHAR), NOW(), 'Recrutement des tuteurs scolaires à Msaken.', 
     '[{"id": "q1", "type": "RADIO", "label": "Niveau d''études maximum", "options": ["Bac", "Licence", "Master"], "required": true}]',
     'LOCAL', 'Soutien Scolaire Msaken', 'APPROVED')
  ON CONFLICT (id) DO NOTHING;

  -- 7. Insert Form Responses
  -- Response to Template 1 (by Bilel Tunis)
  INSERT INTO youth_form_responses (id, id_form_template, id_volunteer, responses, submitted_at) VALUES
    (gen_random_uuid(), t1_id, v1_id, '{"q1": "Pour aider les personnes démunies.", "q2": 5, "q3": "Weekend"}', NOW() - INTERVAL '3 days')
  ON CONFLICT DO NOTHING;

  -- Response to Template 1 (by Amel Sousse)
  INSERT INTO youth_form_responses (id, id_form_template, id_volunteer, responses, submitted_at) VALUES
    (gen_random_uuid(), t1_id, v2_id, '{"q1": "Passionnée par le secourisme et la santé.", "q2": 4, "q3": "Semaine"}', NOW() - INTERVAL '2 days')
  ON CONFLICT DO NOTHING;

  -- Response to Template 3 (by Omar Msaken)
  INSERT INTO youth_form_responses (id, id_form_template, id_volunteer, responses, submitted_at) VALUES
    (gen_random_uuid(), t3_id, v3_id, '{"q1": "Licence"}', NOW() - INTERVAL '1 day')
  ON CONFLICT DO NOTHING;

  -- 8. Insert Micro Projects
  INSERT INTO micro_projects (id, description, end_date, lead_volunteer_id, participants, results, start_date, status, theme, title, committee_id) VALUES
    (gen_random_uuid(), 'Campagne de plantation d''arbres dans la région de Tunis.', '2026-06-30', v1_id, NULL, NULL, '2026-06-10', 'APPROVED', 'ENVIRONNEMENT', 'Reforestation Tunis', tunis_comm_id),
    (gen_random_uuid(), 'Ateliers de lecture et soutien scolaire pour les enfants à Msaken.', '2026-07-15', v3_id, NULL, NULL, '2026-06-15', 'PENDING_VALIDATION', 'EDUCATION', 'Soutien Scolaire Msaken', msaken_comm_id)
  ON CONFLICT DO NOTHING;

  -- 9. Insert General Recommendations
  INSERT INTO youth_recommendations (id, category, confidence_score, date_creation, description, form_id, generated_at, priority, recommended_missions, recommended_training_ia, status, target, title, committee_id) VALUES
    (gen_random_uuid(), 'Sensibilisation', 0.9, NOW() - INTERVAL '5 days', 'Mettre en place une campagne de prévention routière menée par les jeunes.', NULL, NOW() - INTERVAL '5 days', 'MOYENNE', '["Animateur campagne"]', '["Sensibilisation"]', 'APPROVED', 'Jeunes conducteurs', 'Campagne Sécurité Routière', tunis_comm_id),
    (gen_random_uuid(), 'Formations', 0.85, NOW() - INTERVAL '1 day', 'Proposer une formation de formateur pour renforcer le vivier local.', NULL, NOW() - INTERVAL '1 day', 'ELEVEE', '["Formateur local"]', '["Formation de formateur"]', 'PENDING_VALIDATION', 'Responsables d''équipes', 'Renforcement Formation Msaken', msaken_comm_id)
  ON CONFLICT DO NOTHING;

END $$;
