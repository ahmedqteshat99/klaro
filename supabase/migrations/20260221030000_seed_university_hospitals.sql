-- Seed university hospitals (starter data for testing hospital scraper)

INSERT INTO hospitals (name, type, plz, city, bundesland, website, beds_count, source, is_active, verified)
VALUES
  ('Charité – Universitätsmedizin Berlin', 'Universitätsklinikum', '10117', 'Berlin', 'Berlin',
   'https://www.charite.de', 3000, ARRAY['manual'], true, true),

  ('Universitätsklinikum Hamburg-Eppendorf', 'Universitätsklinikum', '20246', 'Hamburg', 'Hamburg',
   'https://www.uke.de', 1460, ARRAY['manual'], true, true),

  ('Klinikum rechts der Isar der TU München', 'Universitätsklinikum', '81675', 'München', 'Bayern',
   'https://www.mri.tum.de', 1161, ARRAY['manual'], true, true),

  ('Universitätsklinikum Heidelberg', 'Universitätsklinikum', '69120', 'Heidelberg', 'Baden-Württemberg',
   'https://www.klinikum.uni-heidelberg.de', 1900, ARRAY['manual'], true, true),

  ('Universitätsklinikum Düsseldorf', 'Universitätsklinikum', '40225', 'Düsseldorf', 'Nordrhein-Westfalen',
   'https://www.uniklinik-duesseldorf.de', 1280, ARRAY['manual'], true, true),

  ('Universitätsklinikum Frankfurt', 'Universitätsklinikum', '60590', 'Frankfurt am Main', 'Hessen',
   'https://www.kgu.de', 1450, ARRAY['manual'], true, true),

  ('Universitätsklinikum Freiburg', 'Universitätsklinikum', '79106', 'Freiburg', 'Baden-Württemberg',
   'https://www.uniklinik-freiburg.de', 1600, ARRAY['manual'], true, true),

  ('Universitätsklinikum Leipzig', 'Universitätsklinikum', '04103', 'Leipzig', 'Sachsen',
   'https://www.uniklinikum-leipzig.de', 1450, ARRAY['manual'], true, true),

  ('Universitätsklinikum Köln', 'Universitätsklinikum', '50937', 'Köln', 'Nordrhein-Westfalen',
   'https://www.uk-koeln.de', 1580, ARRAY['manual'], true, true),

  ('Universitätsklinikum Würzburg', 'Universitätsklinikum', '97080', 'Würzburg', 'Bayern',
   'https://www.ukw.de', 1370, ARRAY['manual'], true, true),

  ('Universitätsklinikum Bonn', 'Universitätsklinikum', '53127', 'Bonn', 'Nordrhein-Westfalen',
   'https://www.ukbonn.de', 1300, ARRAY['manual'], true, true),

  ('Universitätsklinikum Erlangen', 'Universitätsklinikum', '91054', 'Erlangen', 'Bayern',
   'https://www.uk-erlangen.de', 1371, ARRAY['manual'], true, true),

  ('Universitätsklinikum Essen', 'Universitätsklinikum', '45147', 'Essen', 'Nordrhein-Westfalen',
   'https://www.uk-essen.de', 1300, ARRAY['manual'], true, true),

  ('Universitätsklinikum Göttingen', 'Universitätsklinikum', '37075', 'Göttingen', 'Niedersachsen',
   'https://www.umg.eu', 1500, ARRAY['manual'], true, true),

  ('Universitätsklinikum Münster', 'Universitätsklinikum', '48149', 'Münster', 'Nordrhein-Westfalen',
   'https://www.ukm.de', 1457, ARRAY['manual'], true, true),

  ('Universitätsklinikum Tübingen', 'Universitätsklinikum', '72076', 'Tübingen', 'Baden-Württemberg',
   'https://www.medizin.uni-tuebingen.de', 1585, ARRAY['manual'], true, true),

  ('Universitätsklinikum Ulm', 'Universitätsklinikum', '89081', 'Ulm', 'Baden-Württemberg',
   'https://www.uniklinik-ulm.de', 1264, ARRAY['manual'], true, true),

  ('Universitätsklinikum Aachen (RWTH)', 'Universitätsklinikum', '52074', 'Aachen', 'Nordrhein-Westfalen',
   'https://www.ukaachen.de', 1400, ARRAY['manual'], true, true),

  ('Universitätsklinikum Jena', 'Universitätsklinikum', '07747', 'Jena', 'Thüringen',
   'https://www.uniklinikum-jena.de', 1376, ARRAY['manual'], true, true),

  ('Universitätsklinikum Dresden', 'Universitätsklinikum', '01307', 'Dresden', 'Sachsen',
   'https://www.uniklinikum-dresden.de', 1295, ARRAY['manual'], true, true)
ON CONFLICT (name_normalized, plz) WHERE is_active = true
DO UPDATE SET
  website = EXCLUDED.website,
  beds_count = EXCLUDED.beds_count,
  source = array_cat(hospitals.source, EXCLUDED.source),
  verified = true;

-- Comment
COMMENT ON TABLE hospitals IS 'Seeded with 20 German university hospitals for testing';
