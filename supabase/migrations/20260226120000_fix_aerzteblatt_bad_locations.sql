-- Clear locations that are actually medical department names (not cities)
-- for Ärzteblatt-imported jobs. The next import run will backfill correct
-- locations from the improved parser.

UPDATE jobs
SET location = NULL
WHERE rss_feed_source = 'aerzteblatt'
  AND location IS NOT NULL
  AND lower(trim(location)) IN (
    'radiologie', 'kardiologie', 'chirurgie', 'anästhesie',
    'neurologie', 'gynäkologie', 'pädiatrie', 'psychiatrie',
    'orthopädie', 'urologie', 'dermatologie', 'onkologie',
    'pneumologie', 'nephrologie', 'gastroenterologie',
    'innere medizin', 'intensivmedizin', 'notaufnahme',
    'allgemeinmedizin', 'nuklearmedizin', 'pathologie',
    'hämatologie', 'endokrinologie', 'rheumatologie',
    'geriatrie', 'neonatologie', 'gefäßchirurgie',
    'unfallchirurgie', 'viszeralchirurgie', 'herzchirurgie',
    'thoraxchirurgie', 'kinderchirurgie', 'augenheilkunde',
    'hals-nasen-ohrenheilkunde', 'palliativmedizin',
    'arbeitsmedizin', 'rechtsmedizin', 'mikrobiologie',
    'virologie', 'transfusionsmedizin', 'strahlentherapie',
    'laboratoriumsmedizin', 'weiterbildung', 'facharzt',
    'oberarzt', 'assistenzarzt'
  );
