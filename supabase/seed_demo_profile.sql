-- ============================================================
-- DEMO PROFILE SEED SCRIPT (FIXED)
-- Run this in Supabase SQL Editor (Database → SQL Editor)
-- ============================================================

-- Step 1: Confirm the demo user's email
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email = 'demo@klaro.tools';

-- Step 2: Get the user ID and create profile
DO $$
DECLARE
    demo_user_id UUID;
BEGIN
    SELECT id INTO demo_user_id FROM auth.users WHERE email = 'demo@klaro.tools';
    
    IF demo_user_id IS NULL THEN
        RAISE EXCEPTION 'Demo user not found. Please register demo@klaro.tools first.';
    END IF;

    -- Step 3: Create/Update the profile (using ACTUAL column names)
    INSERT INTO profiles (
        id,
        user_id,
        vorname,
        nachname,
        email,
        telefon,
        stadt,
        geburtsdatum,
        staatsangehoerigkeit,
        familienstand,
        fachrichtung,
        deutschniveau,
        approbationsstatus,
        berufserfahrung_jahre,
        cv_text,
        interessen,
        edv_kenntnisse,
        medizinische_kenntnisse,
        sprachkenntnisse,
        dsgvo_einwilligung,
        dsgvo_einwilligung_datum,
        updated_at
    ) VALUES (
        uuid_generate_v4(),
        demo_user_id,
        'Lara',
        'König',
        'lara.koenig@example.com',
        '+49 151 23456789',
        'Berlin',
        '1992-03-15',
        'Deutsch',
        'Ledig',
        'Innere Medizin',
        'C2 (Muttersprache)',
        'Volle Approbation (06/2022)',
        2,
        'Strukturierte Assistenzärztin mit klinischer Erfahrung in Notaufnahme, Station und Funktionsdiagnostik. Schwerpunkte: Innere Medizin, Kardiologie, Diabetologie. Bekannt für sorgfältige Dokumentation und empathische Patientenkommunikation.',
        'Wandern, Fotografie, Medizinische Fortbildungen',
        ARRAY['MS Office', 'SAP', 'ORBIS', 'digitale Patientenakte'],
        ARRAY['EKG-Auswertung', 'Sonographie Abdomen', 'Echokardiographie Grundlagen', 'Punktionen'],
        ARRAY['Deutsch (Muttersprache)', 'Englisch (C1)', 'Französisch (B1)'],
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        vorname = EXCLUDED.vorname,
        nachname = EXCLUDED.nachname,
        email = EXCLUDED.email,
        telefon = EXCLUDED.telefon,
        stadt = EXCLUDED.stadt,
        geburtsdatum = EXCLUDED.geburtsdatum,
        staatsangehoerigkeit = EXCLUDED.staatsangehoerigkeit,
        familienstand = EXCLUDED.familienstand,
        fachrichtung = EXCLUDED.fachrichtung,
        deutschniveau = EXCLUDED.deutschniveau,
        approbationsstatus = EXCLUDED.approbationsstatus,
        berufserfahrung_jahre = EXCLUDED.berufserfahrung_jahre,
        cv_text = EXCLUDED.cv_text,
        interessen = EXCLUDED.interessen,
        edv_kenntnisse = EXCLUDED.edv_kenntnisse,
        medizinische_kenntnisse = EXCLUDED.medizinische_kenntnisse,
        sprachkenntnisse = EXCLUDED.sprachkenntnisse,
        updated_at = NOW();

    -- Step 4: Add Work Experiences
    DELETE FROM work_experiences WHERE user_id = demo_user_id;
    
    INSERT INTO work_experiences (user_id, klinik, station, taetigkeiten, zeitraum_von, zeitraum_bis) VALUES
    (demo_user_id, 'Charité – Universitätsmedizin Berlin', 'Klinik für Innere Medizin / Kardiologie', 
     'Stationsarbeit und Patientenaufnahme auf der kardiologischen Station. Durchführung und Befundung von EKGs, Langzeit-EKGs und Echokardiographien. Eigenständige Visiten unter oberärztlicher Supervision. Erstellung von Arztbriefen und Befundberichten. Interdisziplinäre Fallbesprechungen.', 
     '2022-08-01', NULL),
    
    (demo_user_id, 'Vivantes Klinikum Neukölln', 'Zentrale Notaufnahme',
     'Ersteinschätzung und Triage von Notfallpatienten. Akutversorgung internistischer Notfälle. Durchführung von Notfallsonographien. Koordination mit Fachkliniken und Rettungsdienst.', 
     '2022-02-01', '2022-07-31');

    -- Step 5: Add Education
    DELETE FROM education_entries WHERE user_id = demo_user_id;
    
    INSERT INTO education_entries (user_id, universitaet, abschluss, abschlussarbeit, zeitraum_von, zeitraum_bis) VALUES
    (demo_user_id, 'Ludwig-Maximilians-Universität München', 'Staatsexamen Humanmedizin (Note: 1,7)', 
     'Doktorarbeit: "Prävalenz von subklinischer Myokardschädigung bei asymptomatischen Diabetikern"', 
     '2016-10-01', '2022-05-31'),
    (demo_user_id, 'Max-Planck-Gymnasium München', 'Abitur (Note: 1,3)', 
     'Leistungskurse: Biologie, Chemie', 
     '2008-09-01', '2016-06-30');

    -- Step 6: Add Practical Experiences
    DELETE FROM practical_experiences WHERE user_id = demo_user_id;
    
    INSERT INTO practical_experiences (user_id, einrichtung, fachbereich, typ, beschreibung, zeitraum_von, zeitraum_bis) VALUES
    (demo_user_id, 'Universitätsklinikum Heidelberg', 'Innere Medizin / Gastroenterologie', 'Praktisches Jahr',
     'Tertial Innere Medizin mit Schwerpunkt Gastroenterologie', '2021-05-01', '2021-08-31'),
    (demo_user_id, 'Klinikum rechts der Isar', 'Chirurgie', 'Praktisches Jahr',
     'Tertial Chirurgie, Rotation durch Allgemein- und Viszeralchirurgie', '2021-09-01', '2021-12-31'),
    (demo_user_id, 'Universitätsklinikum München', 'Kardiologie', 'Praktisches Jahr',
     'Wahlfach Kardiologie mit Herzkatheterlabor-Rotation', '2022-01-01', '2022-04-30'),
    (demo_user_id, 'Praxis Dr. med. Weber', 'Allgemeinmedizin', 'Famulatur',
     'Einblick in hausärztliche Versorgung', '2019-03-01', '2019-03-31');

    -- Step 7: Add Certifications
    DELETE FROM certifications WHERE user_id = demo_user_id;
    
    INSERT INTO certifications (user_id, name, aussteller, datum) VALUES
    (demo_user_id, 'Advanced Life Support (ALS) Provider', 'European Resuscitation Council', '2023-06-15'),
    (demo_user_id, 'Strahlenschutzkurs (Grund- und Spezialkurs)', 'Ärztekammer Berlin', '2022-09-10'),
    (demo_user_id, 'Sonographie Grundkurs Abdomen (DEGUM)', 'DEGUM', '2023-02-20'),
    (demo_user_id, 'Echokardiographie Grundkurs', 'Deutsche Gesellschaft für Kardiologie', '2023-08-05'),
    (demo_user_id, 'Hygieneschulung', 'Charité Berlin', '2023-01-15');

    -- Step 8: Add Publications
    DELETE FROM publications WHERE user_id = demo_user_id;
    
    INSERT INTO publications (user_id, titel, typ, journal_ort, datum, beschreibung) VALUES
    (demo_user_id, 'Prävalenz von subklinischer Myokardschädigung bei asymptomatischen Diabetikern', 
     'Originalarbeit', 'Deutsches Ärzteblatt', '2022-03-15', 
     'König L, Müller H, Schmidt A. DOI: 10.3238/arztebl.2022.0123'),
    (demo_user_id, 'Neue Therapieansätze bei Herzinsuffizienz mit erhaltener Ejektionsfraktion', 
     'Übersichtsartikel', 'Der Kardiologe', '2023-09-01', 
     'König L');

    RAISE NOTICE 'Demo profile created successfully for user: %', demo_user_id;
END $$;

-- Verify the profile was created
SELECT 
    p.vorname, 
    p.nachname, 
    p.email,
    p.fachrichtung,
    p.deutschniveau,
    (SELECT COUNT(*) FROM work_experiences WHERE user_id = p.user_id) as work_exp_count,
    (SELECT COUNT(*) FROM education_entries WHERE user_id = p.user_id) as education_count,
    (SELECT COUNT(*) FROM practical_experiences WHERE user_id = p.user_id) as practical_count,
    (SELECT COUNT(*) FROM certifications WHERE user_id = p.user_id) as cert_count,
    (SELECT COUNT(*) FROM publications WHERE user_id = p.user_id) as pub_count
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE u.email = 'demo@klaro.tools';
