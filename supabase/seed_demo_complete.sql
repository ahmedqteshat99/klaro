-- ============================================================
-- COMPLETE DEMO PROFILE - ALL SECTIONS FILLED
-- Run this in Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
    demo_user_id UUID;
BEGIN
    SELECT id INTO demo_user_id FROM auth.users WHERE email = 'demo@klaro.tools';
    
    IF demo_user_id IS NULL THEN
        RAISE EXCEPTION 'Demo user not found. Please register demo@klaro.tools first.';
    END IF;

    -- ============================================================
    -- 1. PROFILE - All fields filled
    -- ============================================================
    UPDATE profiles SET
        vorname = 'Lara',
        nachname = 'König',
        geburtsdatum = '1992-03-15',
        staatsangehoerigkeit = 'Deutsch',
        familienstand = 'Ledig',
        stadt = 'Berlin',
        email = 'lara.koenig@example.com',
        telefon = '+49 151 23456789',
        foto_url = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=500&fit=crop',
        signatur_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Unterschrift_Muster.svg/320px-Unterschrift_Muster.svg.png',
        fachrichtung = 'Innere Medizin',
        approbationsstatus = 'Volle Approbation seit 06/2022',
        deutschniveau = 'C2',
        berufserfahrung_jahre = 2,
        cv_text = 'Strukturierte Assistenzärztin mit klinischer Erfahrung in Notaufnahme, Station und Funktionsdiagnostik. Schwerpunkte: Innere Medizin, Kardiologie, Diabetologie. Bekannt für sorgfältige Dokumentation und empathische Patientenkommunikation.',
        medizinische_kenntnisse = ARRAY['EKG-Auswertung', 'Sonographie Abdomen', 'Echokardiographie', 'Punktionen', 'Blutgasanalyse', 'Notfallmedizin/ALS', 'Diabetologie'],
        edv_kenntnisse = ARRAY['MS Office', 'SAP/IS-H', 'ORBIS', 'Digitale Patientenakte', 'PACS', 'PubMed/UpToDate'],
        sprachkenntnisse = ARRAY['Deutsch – C2 (Muttersprache)', 'Englisch – C1', 'Französisch – B1'],
        interessen = 'Wandern, Reisefotografie, Medizinische Fortbildungen, Yoga',
        dsgvo_einwilligung = true,
        dsgvo_einwilligung_datum = NOW(),
        updated_at = NOW()
    WHERE user_id = demo_user_id;

    -- ============================================================
    -- 2. BERUFSERFAHRUNG (Work Experiences)
    -- ============================================================
    DELETE FROM work_experiences WHERE user_id = demo_user_id;
    
    INSERT INTO work_experiences (user_id, klinik, station, taetigkeiten, zeitraum_von, zeitraum_bis) VALUES
    (demo_user_id, 
     'Charité – Universitätsmedizin Berlin', 
     'Klinik für Innere Medizin / Kardiologie', 
     'Stationsarbeit und Patientenaufnahme auf der kardiologischen Station
Durchführung und Befundung von EKGs, Langzeit-EKGs und Echokardiographien
Eigenständige Visiten unter oberärztlicher Supervision
Erstellung von Arztbriefen und Befundberichten
Interdisziplinäre Fallbesprechungen und Tumorkonferenzen
Betreuung von Studierenden im Praktischen Jahr', 
     '2022-08-01', NULL),
    
    (demo_user_id, 
     'Vivantes Klinikum Neukölln', 
     'Zentrale Notaufnahme (Rotation)', 
     'Ersteinschätzung und Triage von Notfallpatienten nach Manchester-Triage
Akutversorgung internistischer Notfälle (ACS, Stroke, Sepsis)
Durchführung von Notfallsonographien (FAST, Abdomen)
Koordination mit Fachkliniken und Rettungsdienst
Schockraummanagement bei kritischen Patienten', 
     '2022-02-01', '2022-07-31');

    -- ============================================================
    -- 3. AUSBILDUNG (Education)
    -- ============================================================
    DELETE FROM education_entries WHERE user_id = demo_user_id;
    
    INSERT INTO education_entries (user_id, universitaet, abschluss, abschlussarbeit, zeitraum_von, zeitraum_bis) VALUES
    (demo_user_id, 
     'Ludwig-Maximilians-Universität München', 
     'Staatsexamen Humanmedizin (Note: 1,7)', 
     'Dissertation: "Prävalenz von subklinischer Myokardschädigung bei asymptomatischen Diabetikern mittels kardialer MRT" – magna cum laude', 
     '2016-10-01', '2022-05-31'),
    
    (demo_user_id, 
     'Max-Planck-Gymnasium München', 
     'Abitur (Note: 1,3)', 
     'Leistungskurse: Biologie, Chemie', 
     '2008-09-01', '2016-06-30');

    -- ============================================================
    -- 4. PRAKTISCHE ERFAHRUNGEN (Famulaturen, PJ)
    -- ============================================================
    DELETE FROM practical_experiences WHERE user_id = demo_user_id;
    
    INSERT INTO practical_experiences (user_id, einrichtung, fachbereich, typ, beschreibung, zeitraum_von, zeitraum_bis) VALUES
    (demo_user_id, 
     'Universitätsklinikum Heidelberg', 
     'Innere Medizin / Gastroenterologie', 
     'Praktisches Jahr',
     'PJ-Tertial Innere Medizin mit Schwerpunkt Gastroenterologie. Endoskopie-Assistenz, Stationsarbeit, Fallpräsentationen.', 
     '2021-05-01', '2021-08-31'),
    
    (demo_user_id, 
     'Klinikum rechts der Isar, TU München', 
     'Allgemein- und Viszeralchirurgie', 
     'Praktisches Jahr',
     'PJ-Tertial Chirurgie. Rotation durch Allgemein- und Viszeralchirurgie, OP-Assistenz, Wundversorgung.', 
     '2021-09-01', '2021-12-31'),
    
    (demo_user_id, 
     'Deutsches Herzzentrum München', 
     'Kardiologie', 
     'Praktisches Jahr',
     'PJ-Wahlfach Kardiologie. Herzkatheterlabor-Rotation, Echokardiographie-Einarbeitung, Rhythmologie.', 
     '2022-01-01', '2022-04-30'),
    
    (demo_user_id, 
     'Praxis Dr. med. Weber & Kollegen', 
     'Allgemeinmedizin', 
     'Famulatur',
     'Einblick in hausärztliche Versorgung, chronische Erkrankungen, Präventionsmedizin.', 
     '2019-03-01', '2019-03-31'),
    
    (demo_user_id, 
     'Klinikum der Universität München', 
     'Innere Medizin', 
     'Famulatur',
     'Stationsarbeit auf der internistischen Normalstation, Blutentnahmen, Patientengespräche.', 
     '2018-08-01', '2018-08-31');

    -- ============================================================
    -- 5. ZERTIFIKATE (Certifications)
    -- ============================================================
    DELETE FROM certifications WHERE user_id = demo_user_id;
    
    INSERT INTO certifications (user_id, name, aussteller, datum) VALUES
    (demo_user_id, 'Advanced Life Support (ALS) Provider', 'European Resuscitation Council (ERC)', '2023-06-15'),
    (demo_user_id, 'Basic Life Support (BLS) Instructor', 'Deutsches Rotes Kreuz', '2022-11-20'),
    (demo_user_id, 'Strahlenschutzkurs – Grund- und Spezialkurs', 'Ärztekammer Berlin', '2022-09-10'),
    (demo_user_id, 'Sonographie Grundkurs Abdomen (DEGUM-zertifiziert)', 'Deutsche Gesellschaft für Ultraschall in der Medizin', '2023-02-20'),
    (demo_user_id, 'Echokardiographie Grundkurs', 'Deutsche Gesellschaft für Kardiologie', '2023-08-05'),
    (demo_user_id, 'Notfallsonographie (FAST) Kurs', 'DEGUM', '2022-12-01'),
    (demo_user_id, 'Krankenhaushygiene – Jährliche Pflichtschulung', 'Charité Berlin', '2024-01-15'),
    (demo_user_id, 'Transfusionsmedizin Grundkurs', 'Ärztekammer Berlin', '2022-10-05');

    -- ============================================================
    -- 6. PUBLIKATIONEN (Publications)
    -- ============================================================
    DELETE FROM publications WHERE user_id = demo_user_id;
    
    INSERT INTO publications (user_id, titel, typ, journal_ort, datum, beschreibung) VALUES
    (demo_user_id, 
     'Prävalenz von subklinischer Myokardschädigung bei asymptomatischen Diabetikern mittels kardialer MRT', 
     'Originalarbeit', 
     'Deutsches Ärzteblatt', 
     '2022-03-15', 
     'König L, Müller H, Schmidt A, Weber B. DOI: 10.3238/arztebl.2022.0123'),
    
    (demo_user_id, 
     'Neue Therapieansätze bei Herzinsuffizienz mit erhaltener Ejektionsfraktion (HFpEF)', 
     'Übersichtsartikel', 
     'Der Kardiologe', 
     '2023-09-01', 
     'König L. Review der aktuellen Studienlage zu SGLT2-Inhibitoren bei HFpEF.'),
    
    (demo_user_id, 
     'Fallbericht: Seltene Präsentation eines akuten Koronarsyndroms bei junger Patientin', 
     'Fallbericht', 
     'Medizinische Klinik - Intensivmedizin und Notfallmedizin', 
     '2023-05-20', 
     'König L, Schmidt M. Case Report einer 28-jährigen Patientin mit atypischer Symptomatik.');

    RAISE NOTICE 'All sections filled successfully for demo user!';
END $$;

-- ============================================================
-- VERIFY ALL DATA
-- ============================================================
SELECT 'Profile' as section, 
       p.vorname || ' ' || p.nachname as name,
       p.fachrichtung,
       p.deutschniveau,
       CASE WHEN p.foto_url IS NOT NULL THEN '✓' ELSE '✗' END as foto,
       CASE WHEN p.signatur_url IS NOT NULL THEN '✓' ELSE '✗' END as signatur
FROM profiles p
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@klaro.tools');

SELECT 'Counts' as info,
       (SELECT COUNT(*) FROM work_experiences WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@klaro.tools')) as beruf,
       (SELECT COUNT(*) FROM education_entries WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@klaro.tools')) as ausbildung,
       (SELECT COUNT(*) FROM practical_experiences WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@klaro.tools')) as praktika,
       (SELECT COUNT(*) FROM certifications WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@klaro.tools')) as zertifikate,
       (SELECT COUNT(*) FROM publications WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@klaro.tools')) as publikationen;

