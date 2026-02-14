-- DEBUG: Check if data exists and is linked to the demo user correctly

-- Get demo user ID
SELECT 'auth.users' as table_name, id, email FROM auth.users WHERE email = 'demo@klaro.tools';

-- Check profile
SELECT 'profiles' as table_name, id, user_id, vorname, nachname 
FROM profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@klaro.tools');

-- Check work_experiences  
SELECT 'work_experiences' as table_name, id, user_id, klinik, station
FROM work_experiences WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@klaro.tools');

-- Check education_entries
SELECT 'education_entries' as table_name, id, user_id, universitaet, abschluss
FROM education_entries WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@klaro.tools');

-- Check practical_experiences
SELECT 'practical_experiences' as table_name, id, user_id, einrichtung, typ
FROM practical_experiences WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@klaro.tools');

-- Check certifications
SELECT 'certifications' as table_name, id, user_id, name, aussteller
FROM certifications WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@klaro.tools');

-- Check publications
SELECT 'publications' as table_name, id, user_id, titel, typ
FROM publications WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@klaro.tools');
