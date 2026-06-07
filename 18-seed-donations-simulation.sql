-- =============================================================================
-- NEXUS-AID — 18-seed-donations-simulation.sql
-- COMPREHENSIVE SIMULATION DATA FOR DONATION NEEDS, VALIDATIONS AND RECIEPTS
-- Database: nexusaid_admin
-- Scenario count: 7 situations * 10 examples minimum = 70+ test cases
-- =============================================================================
\c nexusaid_admin;

-- Clean existing mock data if any
DELETE FROM in_kind_donations WHERE receipt_number LIKE 'REC-SIM%';
DELETE FROM monetary_donations WHERE receipt_number LIKE 'REC-SIM%';
DELETE FROM donation_needs WHERE id::text LIKE '1a000000%' OR id::text LIKE '2b000000%' OR id::text LIKE '3c000000%' OR id::text LIKE '4d000000%';

-- =============================================================================
-- SITUATION A: 10 Needs in PENDING_VALIDATION status
-- Awaiting validation by committee presidents
-- =============================================================================
INSERT INTO donation_needs (
    id, committee_id, committee_type, committee_name, title, description, category, status, 
    target_quantity, current_quantity, created_by, creator_name, creator_role_name, created_at
) VALUES
(
    '1a000000-0000-0000-0000-000000000001', 
    'b0000000-0000-0000-0000-000000000001', 'REGIONAL', 'Comité Régional de Tunis',
    'Kit alimentaire Ramadan pour familles défavorisées',
    'Distribution de kits alimentaires complets pour le mois de Ramadan aux familles dans le besoin à Bab Souika.\n\n---\n📍 Localisation : Bab Souika, Tunis, Tunisie (36.8065, 10.1712)\n📦 Article requis : Kit Alimentaire Familial',
    'FOOD', 'PENDING_VALIDATION', 100, 0, 
    '10000000-0000-0000-0000-000000000011', 'Hichem Jebali', 'RESP_CATASTROPHES', NOW() - INTERVAL '2 days'
),
(
    '1a000000-0000-0000-0000-000000000002', 
    'b0000000-0000-0000-0000-000000000002', 'REGIONAL', 'Comité Régional de Sousse',
    'Couvertures chaudes pour sans-abris hiver 2026',
    'Campagne hivernale de secours pour les personnes sans domicile fixe dans la région de Sousse.\n\n---\n📍 Localisation : Centre-ville de Sousse, Sousse, Tunisie (35.8256, 10.6369)\n📦 Article requis : Couvertures Polaires',
    'CLOTHING', 'PENDING_VALIDATION', 150, 0,
    '70000000-0000-0000-0000-000000000003', 'Chiraz Selmi', 'RESP_JEUNESSE', NOW() - INTERVAL '1 days'
),
(
    '1a000000-0000-0000-0000-000000000003', 
    'b0000000-0000-0000-0000-000000000003', 'REGIONAL', 'Comité Régional de Sfax',
    'Médicaments pédiatriques essentiels et vaccins',
    'Fourniture de vaccins et antibiotiques pédiatriques de première nécessité pour la clinique mobile.\n\n---\n📍 Localisation : Dispensaire de Sakiet Eddair, Sfax, Tunisie (34.7981, 10.7915)\n📦 Article requis : Boites de médicaments pédiatriques',
    'MEDICAL', 'PENDING_VALIDATION', 80, 0,
    '10000000-0000-0000-0000-000000000005', 'Dr. Ines Mansouri', 'RESP_SANTE', NOW() - INTERVAL '3 days'
),
(
    '1a000000-0000-0000-0000-000000000004', 
    'c0000000-0000-0000-0000-000000000001', 'LOCAL', 'Comité Local de Bardo',
    'Lits de camp pliables pour centre d''hébergement temporaire',
    'Équipement d''un centre d''hébergement en cas d''inondations saisonnières.\n\n---\n📍 Localisation : Maison des jeunes, Le Bardo, Tunisie (36.8092, 10.1388)\n📦 Article requis : Lits de camp pliables',
    'SHELTER', 'PENDING_VALIDATION', 40, 0,
    '10000000-0000-0000-0000-000000000011', 'Hichem Jebali', 'RESP_CATASTROPHES', NOW() - INTERVAL '12 hours'
),
(
    '1a000000-0000-0000-0000-000000000005', 
    'c0000000-0000-0000-0000-000000000002', 'LOCAL', 'Comité Local d''Ariana',
    'Packs de couches de lait maternisé premier âge',
    'Aide aux jeunes mères en situation de grande précarité sociale à l''Ariana.\n\n---\n📍 Localisation : Centre social de l''Ariana, Tunisie (36.8624, 10.1955)\n📦 Article requis : Lait Infantile 1er Âge',
    'OTHER', 'PENDING_VALIDATION', 60, 0,
    '10000000-0000-0000-0000-000000000008', 'Leila Zaki', 'RESP_SOCIAL', NOW() - INTERVAL '4 days'
),
(
    '1a000000-0000-0000-0000-000000000006', 
    'c0000000-0000-0000-0000-000000000003', 'LOCAL', 'Comité Local de La Marsa',
    'Fauteuils roulants ergonomiques pour personnes âgées',
    'Besoins urgents identifiés pour plusieurs résidents âgés à mobilité réduite.\n\n---\n📍 Localisation : Cité El Riyadh, La Marsa, Tunisie (36.8790, 10.3242)\n📦 Article requis : Fauteuils Roulants standard',
    'MEDICAL', 'PENDING_VALIDATION', 10, 0,
    '10000000-0000-0000-0000-000000000005', 'Dr. Ines Mansouri', 'RESP_SANTE', NOW() - INTERVAL '5 days'
),
(
    '1a000000-0000-0000-0000-000000000007', 
    'c0000000-0000-0000-0000-000000000006', 'LOCAL', 'Comité Local de Msaken',
    'Cartables et fournitures scolaires pour la rentrée',
    'Don en nature pour les orphelins et enfants de familles démunies.\n\n---\n📍 Localisation : Bureau local CRT, Msaken, Tunisie (35.7330, 10.5830)\n📦 Article requis : Sacs à dos garnis de cahiers',
    'OTHER', 'PENDING_VALIDATION', 200, 0,
    '70000000-0000-0000-0000-000000000004', 'Yassine Mejri', 'RESP_JEUNESSE', NOW() - INTERVAL '6 days'
),
(
    '1a000000-0000-0000-0000-000000000008', 
    'b0000000-0000-0000-0000-000000000001', 'REGIONAL', 'Comité Régional de Tunis',
    'Vêtements chauds pour enfants (2-10 ans)',
    'Collecte de manteaux et vêtements d''hiver pour enfants issus de familles nécessiteuses.\n\n---\n📍 Localisation : Dépôt régional de Tunis, Tunisie (36.8002, 10.1857)\n📦 Article requis : Manteaux d''hiver enfants',
    'CLOTHING', 'PENDING_VALIDATION', 120, 0,
    '10000000-0000-0000-0000-000000000008', 'Leila Zaki', 'RESP_SOCIAL', NOW() - INTERVAL '3 hours'
),
(
    '1a000000-0000-0000-0000-000000000009', 
    'b0000000-0000-0000-0000-000000000004', 'REGIONAL', 'Comité Régional de Bizerte',
    'Bouteilles d''eau potable de 5 Litres',
    'Prévention face aux coupures d''eau régulières et assainissement temporaire.\n\n---\n📍 Localisation : Dépôt local CRT, Bizerte, Tunisie (37.2744, 9.8739)\n📦 Article requis : Packs eau 5L',
    'FOOD', 'PENDING_VALIDATION', 300, 0,
    '10000000-0000-0000-0000-000000000011', 'Hichem Jebali', 'RESP_CATASTROPHES', NOW() - INTERVAL '2 days'
),
(
    '1a000000-0000-0000-0000-000000000010', 
    'b0000000-0000-0000-0000-000000000001', 'REGIONAL', 'Comité Régional de Tunis',
    'Tentes familiales imperméables pour situations d''urgence',
    'Renforcement du stock d''urgence régionale pour parer aux catastrophes naturelles.\n\n---\n📍 Localisation : Centre logistique CRT, Tunis, Tunisie (36.8000, 10.1700)\n📦 Article requis : Tentes 6 places imperméables',
    'SHELTER', 'PENDING_VALIDATION', 25, 0,
    '10000000-0000-0000-0000-000000000011', 'Hichem Jebali', 'RESP_CATASTROPHES', NOW() - INTERVAL '4 days'
);

-- =============================================================================
-- SITUATION B: 10 Needs in VALIDATED status (Open for donations)
-- Approved by validation committee
-- =============================================================================
INSERT INTO donation_needs (
    id, committee_id, committee_type, committee_name, title, description, category, status, 
    target_quantity, current_quantity, created_by, creator_name, creator_role_name, 
    validated_by, validator_name, validated_at, created_at
) VALUES
(
    '2b000000-0000-0000-0000-000000000001', 
    'b0000000-0000-0000-0000-000000000001', 'REGIONAL', 'Comité Régional de Tunis',
    'Colis alimentaires secs non périssables',
    'Ravitaillement urgent en épicerie sèche pour le centre social.\n\n---\n📍 Localisation : Bab El Khadra, Tunis, Tunisie (36.8111, 10.1802)\n📦 Article requis : Carton d''épicerie (Riz, Pates, Huile)',
    'FOOD', 'VALIDATED', 200, 45, 
    '10000000-0000-0000-0000-000000000011', 'Hichem Jebali', 'RESP_CATASTROPHES',
    '20000000-0000-0000-0000-000000000001', 'Walid Hamdi', NOW() - INTERVAL '5 days', NOW() - INTERVAL '6 days'
),
(
    '2b000000-0000-0000-0000-000000000002', 
    'b0000000-0000-0000-0000-000000000002', 'REGIONAL', 'Comité Régional de Sousse',
    'Lecteurs de glycémie et bandelettes réactives',
    'Matériel médical pour les journées de dépistage gratuit du diabète.\n\n---\n📍 Localisation : Place des Martyrs, Sousse, Tunisie (35.8288, 10.6380)\n📦 Article requis : Kits de test de glycémie',
    'MEDICAL', 'VALIDATED', 100, 30,
    '10000000-0000-0000-0000-000000000005', 'Dr. Ines Mansouri', 'RESP_SANTE',
    '20000000-0000-0000-0000-000000000003', 'Chriki Sghaier', NOW() - INTERVAL '3 days', NOW() - INTERVAL '4 days'
),
(
    '2b000000-0000-0000-0000-000000000003', 
    'b0000000-0000-0000-0000-000000000003', 'REGIONAL', 'Comité Régional de Sfax',
    'Matelas une place neufs pour abris',
    'Besoin de matelas confortables pour équiper le centre d''hébergement de passage.\n\n---\n📍 Localisation : Route de Téniour, Sfax, Tunisie (34.7554, 10.7380)\n📦 Article requis : Matelas mousse 1 place',
    'SHELTER', 'VALIDATED', 50, 15,
    '10000000-0000-0000-0000-000000000011', 'Hichem Jebali', 'RESP_CATASTROPHES',
    '20000000-0000-0000-0000-000000000005', 'Hadj Tahar', NOW() - INTERVAL '2 days', NOW() - INTERVAL '3 days'
),
(
    '2b000000-0000-0000-0000-000000000004', 
    'c0000000-0000-0000-0000-000000000001', 'LOCAL', 'Comité Local de Bardo',
    'Paires de chaussures pour enfants de l''école primaire',
    'Aide à l''habillement pour écoliers en détresse financière.\n\n---\n📍 Localisation : Cité des Sciences, Le Bardo, Tunisie (36.8078, 10.1415)\n📦 Article requis : Chaussures de sport enfants',
    'CLOTHING', 'VALIDATED', 80, 0,
    '10000000-0000-0000-0000-000000000008', 'Leila Zaki', 'RESP_SOCIAL',
    '20000000-0000-0000-0000-000000000001', 'Walid Hamdi', NOW() - INTERVAL '1 days', NOW() - INTERVAL '2 days'
),
(
    '2b000000-0000-0000-0000-000000000005', 
    'c0000000-0000-0000-0000-000000000006', 'LOCAL', 'Comité Local de Msaken',
    'Jouets éducatifs et peluches pour enfants hospitalisés',
    'Action de réconfort et distribution dans le service de pédiatrie.\n\n---\n📍 Localisation : Hôpital régional de Msaken, Tunisie (35.7315, 10.5900)\n📦 Article requis : Jeux de société et jouets',
    'OTHER', 'VALIDATED', 120, 50,
    '70000000-0000-0000-0000-000000000004', 'Yassine Mejri', 'RESP_JEUNESSE',
    '20000000-0000-0000-0000-000000000003', 'Chriki Sghaier', NOW() - INTERVAL '4 days', NOW() - INTERVAL '5 days'
),
(
    '2b000000-0000-0000-0000-000000000006', 
    'c0000000-0000-0000-0000-000000000002', 'LOCAL', 'Comité Local d''Ariana',
    'Thermomètres infrarouges médicaux sans contact',
    'Équipement pour la clinique communautaire locale.\n\n---\n📍 Localisation : Clinique CRT Ariana, Ariana, Tunisie (36.8600, 10.1900)\n📦 Article requis : Thermomètres infrarouges',
    'MEDICAL', 'VALIDATED', 30, 10,
    '10000000-0000-0000-0000-000000000005', 'Dr. Ines Mansouri', 'RESP_SANTE',
    '20000000-0000-0000-0000-000000000001', 'Walid Hamdi', NOW() - INTERVAL '2 days', NOW() - INTERVAL '3 days'
),
(
    '2b000000-0000-0000-0000-000000000007', 
    'c0000000-0000-0000-0000-000000000003', 'LOCAL', 'Comité Local de La Marsa',
    'Kits d''hygiène corporelle complets (adultes)',
    'Savon, dentifrice, brosses à dents et gel douche pour distribution immédiate.\n\n---\n📍 Localisation : Route de la Marsa, Cité Edouar, Tunisie (36.8845, 10.3120)\n📦 Article requis : Trousse d''hygiène adulte',
    'OTHER', 'VALIDATED', 150, 40,
    '10000000-0000-0000-0000-000000000008', 'Leila Zaki', 'RESP_SOCIAL',
    '20000000-0000-0000-0000-000000000001', 'Walid Hamdi', NOW() - INTERVAL '1 days', NOW() - INTERVAL '3 days'
),
(
    '2b000000-0000-0000-0000-000000000008', 
    'b0000000-0000-0000-0000-000000000001', 'REGIONAL', 'Comité Régional de Tunis',
    'Pulls et vestes polaires chaudes (Tailles S à XL)',
    'Collecte de vêtements chauds pour adultes vulnérables et sans-abris.\n\n---\n📍 Localisation : Cité El Khadra, Tunis, Tunisie (36.8322, 10.1988)\n📦 Article requis : Manteaux polaires adultes',
    'CLOTHING', 'VALIDATED', 100, 25,
    '10000000-0000-0000-0000-000000000008', 'Leila Zaki', 'RESP_SOCIAL',
    '20000000-0000-0000-0000-000000000001', 'Walid Hamdi', NOW() - INTERVAL '6 days', NOW() - INTERVAL '8 days'
),
(
    '2b000000-0000-0000-0000-000000000009', 
    'b0000000-0000-0000-0000-000000000001', 'REGIONAL', 'Comité Régional de Tunis',
    'Sacs de lait en poudre pour nourrissons (400g)',
    'Aide nutritionnelle de premier plan face aux manques réguliers constatés.\n\n---\n📍 Localisation : Cité Ibn Khaldoun, Tunis, Tunisie (36.8300, 10.1500)\n📦 Article requis : Lait en Poudre Bébé',
    'FOOD', 'VALIDATED', 150, 0,
    '10000000-0000-0000-0000-000000000008', 'Leila Zaki', 'RESP_SOCIAL',
    '20000000-0000-0000-0000-000000000001', 'Walid Hamdi', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '1 days'
),
(
    '2b000000-0000-0000-0000-000000000010', 
    'b0000000-0000-0000-0000-000000000003', 'REGIONAL', 'Comité Régional de Sfax',
    'Kits de premiers secours pour équipes d''intervention',
    'Dotation en matériel de secourisme d''urgence pour les équipes de patrouille mobile.\n\n---\n📍 Localisation : Route de Gremda, Sfax, Tunisie (34.7600, 10.7400)\n📦 Article requis : Trousses de secours équipées',
    'MEDICAL', 'VALIDATED', 50, 12,
    '10000000-0000-0000-0000-000000000004', 'Sami Bouaziz', 'RESP_SECOURISME',
    '20000000-0000-0000-0000-000000000005', 'Hadj Tahar', NOW() - INTERVAL '4 days', NOW() - INTERVAL '5 days'
);

-- =============================================================================
-- SITUATION C: 10 Needs in REJECTED status (Rejected by validators)
-- Rejected with reason
-- =============================================================================
INSERT INTO donation_needs (
    id, committee_id, committee_type, committee_name, title, description, category, status, 
    target_quantity, current_quantity, created_by, creator_name, creator_role_name, 
    rejected_by, rejector_name, rejected_at, rejection_reason, created_at
) VALUES
(
    '3c000000-0000-0000-0000-000000000001', 
    'b0000000-0000-0000-0000-000000000001', 'REGIONAL', 'Comité Régional de Tunis',
    'Ordinateurs portables pour le bureau administratif',
    'Remplacement du parc informatique obsolète du bureau administratif régional.\n\n---\n📍 Localisation : Bureau régional Tunis, Tunisie (36.8000, 10.1800)\n📦 Article requis : PC Portable bureautique',
    'OTHER', 'REJECTED', 5, 0, 
    '10000000-0000-0000-0000-000000000003', 'Karim Trabelsi', 'RESP_DIFFUSION',
    '20000000-0000-0000-0000-000000000001', 'Walid Hamdi', NOW() - INTERVAL '4 days', 
    'Cette demande concerne les frais administratifs internes et non les actions humanitaires directes. Le budget d''investissement SI s''en occupera.', NOW() - INTERVAL '5 days'
),
(
    '3c000000-0000-0000-0000-000000000002', 
    'b0000000-0000-0000-0000-000000000002', 'REGIONAL', 'Comité Régional de Sousse',
    'Repas chauds de traiteur haut de gamme',
    'Distribution de repas gastronomiques pour les familles de l''abri de passage.\n\n---\n📍 Localisation : Abri de Sousse, Tunisie (35.8200, 10.6300)\n📦 Article requis : Repas complets',
    'FOOD', 'REJECTED', 100, 0,
    '70000000-0000-0000-0000-000000000003', 'Chiraz Selmi', 'RESP_JEUNESSE',
    '20000000-0000-0000-0000-000000000003', 'Chriki Sghaier', NOW() - INTERVAL '1 days',
    'Le coût unitaire est déraisonnable pour les opérations de solidarité courantes. Nous privilégions les paniers d''aliments de base ou le réchaud communautaire.', NOW() - INTERVAL '2 days'
),
(
    '3c000000-0000-0000-0000-000000000003', 
    'b0000000-0000-0000-0000-000000000003', 'REGIONAL', 'Comité Régional de Sfax',
    'Kits de chirurgie invasive avancée',
    'Achat et distribution de trousses de microchirurgie pour le dispensaire mobile.\n\n---\n📍 Localisation : Dispensaire de Sfax, Tunisie (34.7400, 10.7600)\n📦 Article requis : Sets de chirurgie',
    'MEDICAL', 'REJECTED', 15, 0,
    '10000000-0000-0000-0000-000000000005', 'Dr. Ines Mansouri', 'RESP_SANTE',
    '20000000-0000-0000-0000-000000000005', 'Hadj Tahar', NOW() - INTERVAL '8 days',
    'Matériel trop spécialisé. Les volontaires sur le terrain ne sont pas habilités à effectuer de la chirurgie invasive. Hors charte CRT.', NOW() - INTERVAL '10 days'
),
(
    '3c000000-0000-0000-0000-000000000004', 
    'c0000000-0000-0000-0000-000000000001', 'LOCAL', 'Comité Local de Bardo',
    'Vêtements de plage d''été pour colonies de vacances',
    'Distribution de maillots et serviettes de bain de marques spécifiques.\n\n---\n📍 Localisation : Bardo centre, Tunisie (36.8100, 10.1400)\n📦 Article requis : Maillots et shorts de bain',
    'CLOTHING', 'REJECTED', 50, 0,
    '10000000-0000-0000-0000-000000000008', 'Leila Zaki', 'RESP_SOCIAL',
    '20000000-0000-0000-0000-000000000001', 'Walid Hamdi', NOW() - INTERVAL '12 hours',
    'Doublon avec la dotation générale de la colonie de vacances d''été déjà financée et validée par le bureau national.', NOW() - INTERVAL '1 days'
),
(
    '3c000000-0000-0000-0000-000000000005', 
    'c0000000-0000-0000-0000-000000000002', 'LOCAL', 'Comité Local d''Ariana',
    'Tentes de luxe avec chauffage intégré pour sinistrés',
    'Achat de tentes de camping familiales haut de gamme avec poêle.\n\n---\n📍 Localisation : Ariana Ville, Tunisie (36.8600, 10.1900)\n📦 Article requis : Tentes chauffées de luxe',
    'SHELTER', 'REJECTED', 10, 0,
    '10000000-0000-0000-0000-000000000011', 'Hichem Jebali', 'RESP_CATASTROPHES',
    '20000000-0000-0000-0000-000000000001', 'Walid Hamdi', NOW() - INTERVAL '3 days',
    'Besoins démesurés. Les tentes standard d''urgence fournies par le stock national sont suffisantes et appropriées pour le climat tunisien.', NOW() - INTERVAL '5 days'
),
(
    '3c000000-0000-0000-0000-000000000006', 
    'c0000000-0000-0000-0000-000000000003', 'LOCAL', 'Comité Local de La Marsa',
    'Kits de compléments alimentaires sportifs protéinés',
    'Fourniture de whey protéine et créatine pour les jeunes du club de sport CRT.\n\n---\n📍 Localisation : Complexe sportif La Marsa, Tunisie (36.8800, 10.3300)\n📦 Article requis : Pots de Whey Protéine 2kg',
    'FOOD', 'REJECTED', 30, 0,
    '10000000-0000-0000-0000-000000000005', 'Dr. Ines Mansouri', 'RESP_SANTE',
    '20000000-0000-0000-0000-000000000001', 'Walid Hamdi', NOW() - INTERVAL '2 days',
    'Le Croissant Rouge soutient les personnes vulnérables en termes d''alimentation de base, pas de supplémentation sportive de confort.', NOW() - INTERVAL '3 days'
),
(
    '3c000000-0000-0000-0000-000000000007', 
    'c0000000-0000-0000-0000-000000000006', 'LOCAL', 'Comité Local de Msaken',
    'Génératrices de courant industrielles 50kW',
    'Équipement du bureau local pour parer aux coupures d''électricité pendant les réunions.\n\n---\n📍 Localisation : Bureau Msaken, Tunisie (35.7300, 10.5800)\n📦 Article requis : Génératrice diesel 50kW',
    'OTHER', 'REJECTED', 2, 0,
    '70000000-0000-0000-0000-000000000004', 'Yassine Mejri', 'RESP_JEUNESSE',
    '20000000-0000-0000-0000-000000000003', 'Chriki Sghaier', NOW() - INTERVAL '7 days',
    'Surdimensionné et trop coûteux pour un comité local. Un petit onduleur ou une génératrice de secours de 3kW est amplement suffisante.', NOW() - INTERVAL '8 days'
),
(
    '3c000000-0000-0000-0000-000000000008', 
    'b0000000-0000-0000-0000-000000000001', 'REGIONAL', 'Comité Régional de Tunis',
    'Téléphones portables intelligents (iPhone)',
    'Achat de téléphones pour faciliter la coordination sur le terrain pendant les crises.\n\n---\n📍 Localisation : Dépôt Tunis, Tunisie (36.8000, 10.1800)\n📦 Article requis : Smartphones haut de gamme',
    'OTHER', 'REJECTED', 10, 0,
    '10000000-0000-0000-0000-000000000011', 'Hichem Jebali', 'RESP_CATASTROPHES',
    '20000000-0000-0000-0000-000000000001', 'Walid Hamdi', NOW() - INTERVAL '4 days',
    'Des smartphones standard d''entrée de gamme sont déjà alloués par la direction nationale pour les besoins opérationnels de terrain.', NOW() - INTERVAL '6 days'
),
(
    '3c000000-0000-0000-0000-000000000009', 
    'b0000000-0000-0000-0000-000000000004', 'REGIONAL', 'Comité Régional de Bizerte',
    'Médicaments de chimiothérapie lourde',
    'Approvisionnement pour des cas spécifiques du cancer à l''hôpital régional.\n\n---\n📍 Localisation : Hôpital de Bizerte, Tunisie (37.2700, 9.8700)\n📦 Article requis : Ampoules de chimiothérapie',
    'MEDICAL', 'REJECTED', 20, 0,
    '10000000-0000-0000-0000-000000000005', 'Dr. Ines Mansouri', 'RESP_SANTE',
    '10000000-0000-0000-0000-000000000001', 'Ahmed Ben Salah', NOW() - INTERVAL '10 days',
    'Les médicaments sous contrôle strict de chimiothérapie relèvent du monopole d''achat hospitalier public et de la Caisse Nationale (CNAM), pas du CRT.', NOW() - INTERVAL '12 days'
),
(
    '3c000000-0000-0000-0000-000000000010', 
    'b0000000-0000-0000-0000-000000000001', 'REGIONAL', 'Comité Régional de Tunis',
    'Kits de maquillage professionnel de catastrophe (Simulations)',
    'Simulateurs de blessures et plaies pour exercices pratiques de secours.\n\n---\n📍 Localisation : Centre de formation, Tunis, Tunisie (36.8000, 10.1700)\n📦 Article requis : Trousses de maquillage blessures',
    'OTHER', 'REJECTED', 15, 0,
    '10000000-0000-0000-0000-000000000004', 'Sami Bouaziz', 'RESP_SECOURISME',
    '20000000-0000-0000-0000-000000000001', 'Walid Hamdi', NOW() - INTERVAL '5 days',
    'Une trousse de maquillage a déjà été achetée le mois dernier pour le pôle formation. Utiliser le matériel existant avant d''en commander du neuf.', NOW() - INTERVAL '6 days'
);

-- =============================================================================
-- SITUATION D: 10 Needs in FULFILLED status (Fully met targets)
-- target_quantity equals current_quantity
-- =============================================================================
INSERT INTO donation_needs (
    id, committee_id, committee_type, committee_name, title, description, category, status, 
    target_quantity, current_quantity, created_by, creator_name, creator_role_name, 
    validated_by, validator_name, validated_at, created_at
) VALUES
(
    '4d000000-0000-0000-0000-000000000001', 
    'b0000000-0000-0000-0000-000000000001', 'REGIONAL', 'Comité Régional de Tunis',
    'Sacs de farine de blé type 55 (50kg)',
    'Soutien urgent pour des boulangeries solidaires de quartier et familles démunies.\n\n---\n📍 Localisation : Cité El Kabaria, Tunis, Tunisie (36.7800, 10.2000)\n📦 Article requis : Sacs de farine 50kg',
    'FOOD', 'FULFILLED', 50, 50, 
    '10000000-0000-0000-0000-000000000011', 'Hichem Jebali', 'RESP_CATASTROPHES',
    '20000000-0000-0000-0000-000000000001', 'Walid Hamdi', NOW() - INTERVAL '10 days', NOW() - INTERVAL '12 days'
),
(
    '4d000000-0000-0000-0000-000000000002', 
    'b0000000-0000-0000-0000-000000000002', 'REGIONAL', 'Comité Régional de Sousse',
    'Bandelettes réactives de test de cholestérol',
    'Consommables médicaux pour les dépistages de maladies cardiovasculaires.\n\n---\n📍 Localisation : Hôpital Sahloul, Sousse, Tunisie (35.8340, 10.5980)\n📦 Article requis : Boites de bandelettes cholestérol',
    'MEDICAL', 'FULFILLED', 60, 60,
    '10000000-0000-0000-0000-000000000005', 'Dr. Ines Mansouri', 'RESP_SANTE',
    '20000000-0000-0000-0000-000000000003', 'Chriki Sghaier', NOW() - INTERVAL '12 days', NOW() - INTERVAL '15 days'
),
(
    '4d000000-0000-0000-0000-000000000003', 
    'b0000000-0000-0000-0000-000000000003', 'REGIONAL', 'Comité Régional de Sfax',
    'Lits de camps légers métalliques',
    'Dotation d''urgence pour équiper les tentes en cas de séisme ou relogement d''urgence.\n\n---\n📍 Localisation : Dépôt régional CRT, Sfax, Tunisie (34.7300, 10.7500)\n📦 Article requis : Lits de camp métalliques',
    'SHELTER', 'FULFILLED', 30, 30,
    '10000000-0000-0000-0000-000000000011', 'Hichem Jebali', 'RESP_CATASTROPHES',
    '20000000-0000-0000-0000-000000000005', 'Hadj Tahar', NOW() - INTERVAL '8 days', NOW() - INTERVAL '9 days'
),
(
    '4d000000-0000-0000-0000-000000000004', 
    'c0000000-0000-0000-0000-000000000001', 'LOCAL', 'Comité Local de Bardo',
    'Couvertures polaires isolantes thermiques',
    'Distribution nocturne pendant la vague de froid hivernal de janvier.\n\n---\n📍 Localisation : Place du Bardo, Tunis, Tunisie (36.8080, 10.1380)\n📦 Article requis : Couvertures thermiques polaires',
    'CLOTHING', 'FULFILLED', 100, 100,
    '10000000-0000-0000-0000-000000000008', 'Leila Zaki', 'RESP_SOCIAL',
    '20000000-0000-0000-0000-000000000001', 'Walid Hamdi', NOW() - INTERVAL '14 days', NOW() - INTERVAL '16 days'
),
(
    '4d000000-0000-0000-0000-000000000005', 
    'c0000000-0000-0000-0000-000000000006', 'LOCAL', 'Comité Local de Msaken',
    'Kits d''alimentation pour prématurés',
    'Besoins identifiés au centre de PMI local.\n\n---\n📍 Localisation : Centre PMI Msaken, Sousse, Tunisie (35.7350, 10.5820)\n📦 Article requis : Boites lait pédiatrique prématurés',
    'FOOD', 'FULFILLED', 40, 40,
    '70000000-0000-0000-0000-000000000004', 'Yassine Mejri', 'RESP_JEUNESSE',
    '20000000-0000-0000-0000-000000000003', 'Chriki Sghaier', NOW() - INTERVAL '11 days', NOW() - INTERVAL '12 days'
),
(
    '4d000000-0000-0000-0000-000000000006', 
    'c0000000-0000-0000-0000-000000000002', 'LOCAL', 'Comité Local d''Ariana',
    'Fauteuils roulants légers en aluminium',
    'Distribution pour personnes à mobilité réduite suivies par le centre social.\n\n---\n📍 Localisation : Centre de soins Ariana, Tunisie (36.8620, 10.1980)\n📦 Article requis : Fauteuils pliants aluminium',
    'MEDICAL', 'FULFILLED', 15, 15,
    '10000000-0000-0000-0000-000000000005', 'Dr. Ines Mansouri', 'RESP_SANTE',
    '20000000-0000-0000-0000-000000000001', 'Walid Hamdi', NOW() - INTERVAL '15 days', NOW() - INTERVAL '18 days'
),
(
    '4d000000-0000-0000-0000-000000000007', 
    'c0000000-0000-0000-0000-000000000003', 'LOCAL', 'Comité Local de La Marsa',
    'Paires de bottes imperméables de sécurité (T41 à 45)',
    'Équipement pour les bénévoles de première ligne intervenant en zones inondées.\n\n---\n📍 Localisation : Cité El Hana, La Marsa, Tunisie (36.8780, 10.3200)\n📦 Article requis : Bottes en caoutchouc renforcé',
    'CLOTHING', 'FULFILLED', 40, 40,
    '10000000-0000-0000-0000-000000000004', 'Sami Bouaziz', 'RESP_SECOURISME',
    '20000000-0000-0000-0000-000000000001', 'Walid Hamdi', NOW() - INTERVAL '9 days', NOW() - INTERVAL '10 days'
),
(
    '4d000000-0000-0000-0000-000000000008', 
    'b0000000-0000-0000-0000-000000000001', 'REGIONAL', 'Comité Régional de Tunis',
    'Kits scolaires complets avec sacs et trousses',
    'Campagne Rentrée Scolaire Solidaire pour les écoliers de la banlieue ouest.\n\n---\n📍 Localisation : Mellassine, Tunis, Tunisie (36.7970, 10.1500)\n📦 Article requis : Kits scolaires complets',
    'OTHER', 'FULFILLED', 80, 80,
    '10000000-0000-0000-0000-000000000008', 'Leila Zaki', 'RESP_SOCIAL',
    '20000000-0000-0000-0000-000000000001', 'Walid Hamdi', NOW() - INTERVAL '20 days', NOW() - INTERVAL '22 days'
),
(
    '4d000000-0000-0000-0000-000000000009', 
    'b0000000-0000-0000-0000-000000000001', 'REGIONAL', 'Comité Régional de Tunis',
    'Boîtes de lait maternisé en poudre (Modilac/Guigoz)',
    'Ravitaillement critique de nourrissons orphelins ou sans ressources à Tunis.\n\n---\n📍 Localisation : Cité El Khadra, Tunis, Tunisie (36.8330, 10.2000)\n📦 Article requis : Boites de lait premier age',
    'FOOD', 'FULFILLED', 120, 120,
    '10000000-0000-0000-0000-000000000008', 'Leila Zaki', 'RESP_SOCIAL',
    '20000000-0000-0000-0000-000000000001', 'Walid Hamdi', NOW() - INTERVAL '15 days', NOW() - INTERVAL '16 days'
),
(
    '4d000000-0000-0000-0000-000000000010', 
    'b0000000-0000-0000-0000-000000000003', 'REGIONAL', 'Comité Régional de Sfax',
    'Colliers cervicaux d''urgence (Tailles multiples)',
    'Équipement pour les ambulances d''évacuation CRT locales.\n\n---\n📍 Localisation : Route de Mahdia, Sfax, Tunisie (34.7700, 10.7800)\n📦 Article requis : Colliers cervicaux rigides',
    'MEDICAL', 'FULFILLED', 20, 20,
    '10000000-0000-0000-0000-000000000004', 'Sami Bouaziz', 'RESP_SECOURISME',
    '20000000-0000-0000-0000-000000000005', 'Hadj Tahar', NOW() - INTERVAL '18 days', NOW() - INTERVAL '20 days'
);

-- =============================================================================
-- SITUATION E: 10 In-Kind Donations LINKED to active/fulfilled needs
-- Status validated & receipt generated
-- =============================================================================
INSERT INTO in_kind_donations (
    id, donor_id, donor_name, donor_cin, need_id, items_description, 
    receipt_date, receipt_number, qr_code_data, received_by, created_at
) VALUES
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000001', 'Bilel Tunis', '05555555',
    '2b000000-0000-0000-0000-000000000001', 
    '[{"item": "Colis d''épicerie (Riz, Pates, Huile)", "quantity": 15, "unit": "cartons", "photoUrl": "https://images.unsplash.com/photo-1593113598332-cd288d649433", "note": "Cartons scellés, DLUO longue"}]'::jsonb,
    CURRENT_DATE - 3, 'REC-SIM-INKIND-001', 'QR-SIM-INKIND-001', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000002', 'Amel Sousse', '06666666',
    '2b000000-0000-0000-0000-000000000002', 
    '[{"item": "Kits de test de glycémie", "quantity": 20, "unit": "boites", "photoUrl": "https://images.unsplash.com/photo-1603398938378-e54eab446dde", "note": "Lecteurs OneTouch neufs"}]'::jsonb,
    CURRENT_DATE - 2, 'REC-SIM-INKIND-002', 'QR-SIM-INKIND-002', '20000000-0000-0000-0000-000000000003', NOW() - INTERVAL '2 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000003', 'Omar Msaken', '07777777',
    '2b000000-0000-0000-0000-000000000005', 
    '[{"item": "Jeux de société et jouets", "quantity": 30, "unit": "unités", "photoUrl": "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1", "note": "Peluches et jeux de société"}]'::jsonb,
    CURRENT_DATE - 1, 'REC-SIM-INKIND-003', 'QR-SIM-INKIND-003', '20000000-0000-0000-0000-000000000003', NOW() - INTERVAL '1 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000001', 'Bilel Tunis', '05555555',
    '2b000000-0000-0000-0000-000000000008', 
    '[{"item": "Manteaux polaires adultes", "quantity": 25, "unit": "pièces", "photoUrl": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6", "note": "Vestes d''hiver neuves"}]'::jsonb,
    CURRENT_DATE - 4, 'REC-SIM-INKIND-004', 'QR-SIM-INKIND-004', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '4 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000002', 'Amel Sousse', '06666666',
    '2b000000-0000-0000-0000-000000000002', 
    '[{"item": "Kits de test de glycémie", "quantity": 10, "unit": "boites", "photoUrl": null, "note": "Bandelettes réactives"}]'::jsonb,
    CURRENT_DATE - 1, 'REC-SIM-INKIND-005', 'QR-SIM-INKIND-005', '20000000-0000-0000-0000-000000000003', NOW() - INTERVAL '1 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000003', 'Omar Msaken', '07777777',
    '2b000000-0000-0000-0000-000000000005', 
    '[{"item": "Jeux de société et jouets", "quantity": 20, "unit": "unités", "photoUrl": null, "note": "Lego et crayons couleur"}]'::jsonb,
    CURRENT_DATE - 1, 'REC-SIM-INKIND-006', 'QR-SIM-INKIND-006', '20000000-0000-0000-0000-000000000003', NOW() - INTERVAL '1 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000001', 'Bilel Tunis', '05555555',
    '4d000000-0000-0000-0000-000000000001', 
    '[{"item": "Sacs de farine 50kg", "quantity": 50, "unit": "sacs", "photoUrl": "https://images.unsplash.com/photo-1509440159596-0249088772ff", "note": "Farine type 55 Tunisie"}]'::jsonb,
    CURRENT_DATE - 8, 'REC-SIM-INKIND-007', 'QR-SIM-INKIND-007', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '8 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000002', 'Amel Sousse', '06666666',
    '4d000000-0000-0000-0000-000000000002', 
    '[{"item": "Boites de bandelettes cholestérol", "quantity": 60, "unit": "boites", "photoUrl": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae", "note": "Expiration decembre 2026"}]'::jsonb,
    CURRENT_DATE - 10, 'REC-SIM-INKIND-008', 'QR-SIM-INKIND-008', '20000000-0000-0000-0000-000000000003', NOW() - INTERVAL '10 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000001', 'Bilel Tunis', '05555555',
    '4d000000-0000-0000-0000-000000000004', 
    '[{"item": "Couvertures thermiques polaires", "quantity": 100, "unit": "unités", "photoUrl": "https://images.unsplash.com/photo-1543269865-cbf427effbad", "note": "Doubles polaires épaisses"}]'::jsonb,
    CURRENT_DATE - 12, 'REC-SIM-INKIND-009', 'QR-SIM-INKIND-009', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '12 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000003', 'Omar Msaken', '07777777',
    '4d000000-0000-0000-0000-000000000005', 
    '[{"item": "Boites lait pédiatrique prématurés", "quantity": 40, "unit": "boites", "photoUrl": "https://images.unsplash.com/photo-1522844990619-4951c40f3edf", "note": "Nestlé Pre-Nan"}]'::jsonb,
    CURRENT_DATE - 7, 'REC-SIM-INKIND-010', 'QR-SIM-INKIND-010', '20000000-0000-0000-0000-000000000003', NOW() - INTERVAL '7 days'
);

-- =============================================================================
-- SITUATION F: 10 In-Kind Donations DIRECT / LIBRE (Not linked to any need)
-- need_id is NULL
-- =============================================================================
INSERT INTO in_kind_donations (
    id, donor_id, donor_name, donor_cin, need_id, items_description, 
    receipt_date, receipt_number, qr_code_data, received_by, created_at
) VALUES
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000001', 'Donateur Anonyme 1', NULL,
    NULL, 
    '[{"item": "Bouteilles d''huile d''olive 1L", "quantity": 50, "unit": "bouteilles", "photoUrl": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5", "note": "Récolte locale"}]'::jsonb,
    CURRENT_DATE - 2, 'REC-SIM-INKIND-DIR01', 'QR-SIM-INKIND-DIR01', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000002', 'Société Tunisienne Agro', NULL,
    NULL, 
    '[{"item": "Concentré de tomate 800g", "quantity": 120, "unit": "boîtes", "photoUrl": "https://images.unsplash.com/photo-1593113630400-ea4288922497", "note": "Sicam"}]'::jsonb,
    CURRENT_DATE - 5, 'REC-SIM-INKIND-DIR02', 'QR-SIM-INKIND-DIR02', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '5 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000003', 'Pharmacie Lafayette', NULL,
    NULL, 
    '[{"item": "Pansements adhésifs et compresses steril", "quantity": 200, "unit": "boîtes", "photoUrl": "https://images.unsplash.com/photo-1576091160550-2173dba999ef", "note": "Hypoallergénique"}]'::jsonb,
    CURRENT_DATE - 6, 'REC-SIM-INKIND-DIR03', 'QR-SIM-INKIND-DIR03', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '6 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000001', 'Association Espoir Solidaire', NULL,
    NULL, 
    '[{"item": "T-shirts enfants coton (mixte)", "quantity": 150, "unit": "pièces", "photoUrl": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518", "note": "Coloris variés"}]'::jsonb,
    CURRENT_DATE - 3, 'REC-SIM-INKIND-DIR04', 'QR-SIM-INKIND-DIR04', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000002', 'Yasmine Ben Abdallah', '08877665',
    NULL, 
    '[{"item": "Gels désinfectants hydroalcooliques 500ml", "quantity": 40, "unit": "flacons", "photoUrl": null, "note": "Marque SVR"}]'::jsonb,
    CURRENT_DATE - 1, 'REC-SIM-INKIND-DIR05', 'QR-SIM-INKIND-DIR05', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '1 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000003', 'Lions Club Tunis', NULL,
    NULL, 
    '[{"item": "Fauteuils roulants pliants", "quantity": 8, "unit": "unités", "photoUrl": "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1", "note": "Neufs"}]'::jsonb,
    CURRENT_DATE - 10, 'REC-SIM-INKIND-DIR06', 'QR-SIM-INKIND-DIR06', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '10 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000001', 'Meubles & Co Tunis', NULL,
    NULL, 
    '[{"item": "Lits superposés en pin massif", "quantity": 10, "unit": "lits", "photoUrl": null, "note": "Démontés avec visserie"}]'::jsonb,
    CURRENT_DATE - 12, 'REC-SIM-INKIND-DIR07', 'QR-SIM-INKIND-DIR07', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '12 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000002', 'Boucherie Solidaire Sfax', NULL,
    NULL, 
    '[{"item": "Viande de boeuf hachée fraiche (paquet 1kg)", "quantity": 50, "unit": "kg", "photoUrl": null, "note": "Sous vide, congelé à -18C"}]'::jsonb,
    CURRENT_DATE - 4, 'REC-SIM-INKIND-DIR08', 'QR-SIM-INKIND-DIR08', '20000000-0000-0000-0000-000000000005', NOW() - INTERVAL '4 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000003', 'Textile du Nord', NULL,
    NULL, 
    '[{"item": "Jeans garçons et filles (6-12 ans)", "quantity": 90, "unit": "pièces", "photoUrl": null, "note": "Surplus d''usine"}]'::jsonb,
    CURRENT_DATE - 15, 'REC-SIM-INKIND-DIR09', 'QR-SIM-INKIND-DIR09', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '15 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000001', 'Grande Surface Carrefour', NULL,
    NULL, 
    '[{"item": "Lessive liquide Ariel 3L", "quantity": 60, "unit": "bidons", "photoUrl": null, "note": "Entretien des centres d''hébergement"}]'::jsonb,
    CURRENT_DATE - 9, 'REC-SIM-INKIND-DIR10', 'QR-SIM-INKIND-DIR10', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '9 days'
);

-- =============================================================================
-- SITUATION G: 10 Monetary Donations (Historical support / Legacy audit)
-- Validated monetary donations
-- =============================================================================
INSERT INTO monetary_donations (
    id, donor_id, donor_name, donor_cin, need_id, amount, currency, 
    payment_method, receipt_number, receipt_date, qr_code_data, received_by, created_at
) VALUES
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000001', 'Sofiene Cherni', '09283746', NULL,
    250.00, 'TND', 'CASH', 'REC-SIM-MON-001', CURRENT_DATE - 10, 'QR-SIM-MON-001', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '10 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000002', 'Lions Club Tunis', NULL, NULL,
    1500.00, 'TND', 'TRANSFER', 'REC-SIM-MON-002', CURRENT_DATE - 8, 'QR-SIM-MON-002', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '8 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000003', 'Kamel Oueslati', '01122334', NULL,
    100.00, 'TND', 'CARD', 'REC-SIM-MON-003', CURRENT_DATE - 5, 'QR-SIM-MON-003', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '5 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000001', 'Radhia Bouazizi', '07766554', NULL,
    50.00, 'TND', 'CASH', 'REC-SIM-MON-004', CURRENT_DATE - 3, 'QR-SIM-MON-004', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000002', 'Société de Transport Rapide', NULL, NULL,
    3000.00, 'TND', 'CHEQUE', 'REC-SIM-MON-005', CURRENT_DATE - 12, 'QR-SIM-MON-005', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '12 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000003', 'Salma Gharbi', '08844332', NULL,
    300.00, 'TND', 'TRANSFER', 'REC-SIM-MON-006', CURRENT_DATE - 15, 'QR-SIM-MON-006', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '15 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000001', 'Anis Ferchichi', '09900112', NULL,
    150.00, 'TND', 'CARD', 'REC-SIM-MON-007', CURRENT_DATE - 6, 'QR-SIM-MON-007', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '6 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000002', 'Nadia Belkhodja', '08273645', NULL,
    500.00, 'TND', 'CHEQUE', 'REC-SIM-MON-008', CURRENT_DATE - 20, 'QR-SIM-MON-008', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '20 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000003', 'Youssef Ben Salem', '05432109', NULL,
    200.00, 'TND', 'CASH', 'REC-SIM-MON-009', CURRENT_DATE - 1, 'QR-SIM-MON-009', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '1 days'
),
(
    gen_random_uuid(), '80000000-0000-0000-0000-000000000001', 'Rim El Kateb', '01234567', NULL,
    120.00, 'TND', 'CARD', 'REC-SIM-MON-010', CURRENT_DATE - 7, 'QR-SIM-MON-010', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '7 days'
);
