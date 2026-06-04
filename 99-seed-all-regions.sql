DO $$
DECLARE
  nat_id UUID;
BEGIN
  SELECT id INTO nat_id FROM committees WHERE type = 'NATIONAL' LIMIT 1;
  
  INSERT INTO committees (id, name, type, region, parent_committee_id, status) VALUES
    (gen_random_uuid(), 'Comité Régional de Tunis', 'REGIONAL', 'Tunis', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de l''Ariana', 'REGIONAL', 'Ariana', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de Ben Arous', 'REGIONAL', 'Ben Arous', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de la Manouba', 'REGIONAL', 'Manouba', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de Nabeul', 'REGIONAL', 'Nabeul', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de Zaghouan', 'REGIONAL', 'Zaghouan', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de Bizerte', 'REGIONAL', 'Bizerte', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de Béja', 'REGIONAL', 'Béja', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de Jendouba', 'REGIONAL', 'Jendouba', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional du Kef', 'REGIONAL', 'Kef', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de Siliana', 'REGIONAL', 'Siliana', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de Sousse', 'REGIONAL', 'Sousse', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de Monastir', 'REGIONAL', 'Monastir', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de Mahdia', 'REGIONAL', 'Mahdia', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de Sfax', 'REGIONAL', 'Sfax', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de Kairouan', 'REGIONAL', 'Kairouan', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de Kasserine', 'REGIONAL', 'Kasserine', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de Sidi Bouzid', 'REGIONAL', 'Sidi Bouzid', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de Gabès', 'REGIONAL', 'Gabès', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de Médenine', 'REGIONAL', 'Médenine', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de Tataouine', 'REGIONAL', 'Tataouine', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de Gafsa', 'REGIONAL', 'Gafsa', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de Tozeur', 'REGIONAL', 'Tozeur', nat_id, 'ACTIVE'),
    (gen_random_uuid(), 'Comité Régional de Kébili', 'REGIONAL', 'Kébili', nat_id, 'ACTIVE')
  ON CONFLICT (type, region) DO UPDATE SET name = EXCLUDED.name, status = 'ACTIVE';
END $$;
