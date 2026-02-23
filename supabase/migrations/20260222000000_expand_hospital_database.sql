-- Expand hospital database with additional major German hospitals
-- This migration adds 12 more major hospitals to complement the 20 university hospitals already seeded

INSERT INTO hospitals (name, type, plz, city, bundesland, website, beds_count, source, is_active, verified)
VALUES
  -- Baden-Württemberg (additional)
  ('Robert-Bosch-Krankenhaus', 'Krankenhaus', '70376', 'Stuttgart', 'Baden-Württemberg',
   'https://www.rbk.de', 1041, ARRAY['manual'], true, true),
  ('Städtisches Klinikum Karlsruhe', 'Klinikum', '76133', 'Karlsruhe', 'Baden-Württemberg',
   'https://www.klinikum-karlsruhe.de', 1538, ARRAY['manual'], true, true),

  -- Bayern (additional)
  ('Universitätsklinikum Regensburg', 'Universitätsklinikum', '93053', 'Regensburg', 'Bayern',
   'https://www.ukr.de', 833, ARRAY['manual'], true, true),
  ('Klinikum der Universität München (LMU)', 'Universitätsklinikum', '81377', 'München', 'Bayern',
   'https://www.klinikum.uni-muenchen.de', 2200, ARRAY['manual'], true, true),
  ('Klinikum Augsburg', 'Klinikum', '86156', 'Augsburg', 'Bayern',
   'https://www.klinikum-augsburg.de', 1740, ARRAY['manual'], true, true),

  -- Berlin (additional)
  ('Vivantes Klinikum Neukölln', 'Krankenhaus', '12351', 'Berlin', 'Berlin',
   'https://www.vivantes.de', 1200, ARRAY['manual'], true, true),

  -- Brandenburg
  ('Städtisches Klinikum Brandenburg', 'Klinikum', '14770', 'Brandenburg an der Havel', 'Brandenburg',
   'https://www.klinikum-brandenburg.de', 750, ARRAY['manual'], true, true),
  ('Carl-Thiem-Klinikum Cottbus', 'Klinikum', '03048', 'Cottbus', 'Brandenburg',
   'https://www.ctk.de', 880, ARRAY['manual'], true, true),

  -- Bremen
  ('Klinikum Bremen-Mitte', 'Klinikum', '28177', 'Bremen', 'Bremen',
   'https://www.gesundheitnord.de', 1200, ARRAY['manual'], true, true),

  -- Hamburg (additional)
  ('Asklepios Klinik Barmbek', 'Krankenhaus', '22307', 'Hamburg', 'Hamburg',
   'https://www.asklepios.com/hamburg/barmbek', 733, ARRAY['manual'], true, true),

  -- Hessen (additional)
  ('Universitätsklinikum Gießen und Marburg', 'Universitätsklinikum', '35392', 'Gießen', 'Hessen',
   'https://www.ukgm.de', 1850, ARRAY['manual'], true, true),

  -- Niedersachsen (additional)
  ('Medizinische Hochschule Hannover', 'Universitätsklinikum', '30625', 'Hannover', 'Niedersachsen',
   'https://www.mhh.de', 1400, ARRAY['manual'], true, true)

ON CONFLICT (name_normalized, plz) WHERE is_active = true
DO UPDATE SET
  website = EXCLUDED.website,
  beds_count = EXCLUDED.beds_count,
  type = EXCLUDED.type,
  source = array_cat(hospitals.source, EXCLUDED.source),
  verified = true;

-- Comment
COMMENT ON TABLE hospitals IS 'Now contains 32 major German hospitals (20 university + 12 regional)';
