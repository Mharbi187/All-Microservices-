-- Add blood_type column to volunteers table if not exists
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS blood_type VARCHAR(10);

-- Seed blood type data for test volunteers
-- Ali Sghaier (Tunis/Bardo local volunteer)
UPDATE volunteers SET blood_type = 'O+' WHERE id = '40000000-0000-0000-0000-000000000001';
-- Dr. Manel Hadj Tahar (Tunis regional volunteer)
UPDATE volunteers SET blood_type = 'A-' WHERE id = '40000000-0000-0000-0000-000000000002';
-- Mehdi Chebbi (Sousse regional volunteer)
UPDATE volunteers SET blood_type = 'B+' WHERE id = '40000000-0000-0000-0000-000000000003';
-- Hamza Agrebi (La Marsa local volunteer)
UPDATE volunteers SET blood_type = 'AB+' WHERE id = '40000000-0000-0000-0000-000000000004';
-- Yasmine Fersi (Ben Arous local volunteer)
UPDATE volunteers SET blood_type = 'O-' WHERE id = '40000000-0000-0000-0000-000000000005';
