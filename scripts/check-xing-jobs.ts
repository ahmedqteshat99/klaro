import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read .env file manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envVars[match[1].trim()] = match[2].trim();
    }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkXingJobs() {
    // Count XING jobs
    const { count: xingCount, error: countError } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('rss_feed_source', 'xing');

    if (countError) {
        console.error('Error counting XING jobs:', countError);
        return;
    }

    console.log(`\n📊 XING Jobs in Database: ${xingCount || 0}`);

    // Get some sample XING jobs
    const { data: sampleJobs, error: sampleError } = await supabase
        .from('jobs')
        .select('id, title, rss_guid, created_at')
        .eq('rss_feed_source', 'xing')
        .order('created_at', { ascending: false })
        .limit(5);

    if (sampleError) {
        console.error('Error fetching sample jobs:', sampleError);
        return;
    }

    if (sampleJobs && sampleJobs.length > 0) {
        console.log('\n📋 Recent XING Jobs:');
        sampleJobs.forEach((job, i) => {
            console.log(`${i + 1}. ${job.title}`);
            console.log(`   GUID: ${job.rss_guid}`);
            console.log(`   Created: ${new Date(job.created_at).toLocaleString('de-DE')}\n`);
        });
    }

    // Check specific URLs from our test
    const testUrls = [
        'https://www.xing.com/jobs/kaiserslautern-assistenzarzt-neurologie-begleitender-promotionsarbeit-151144358',
        'https://www.xing.com/jobs/bad-hersfeld-assistenzarzt-neurologie-151145741',
        'https://www.xing.com/jobs/hanau-assistenzarzt-assistenzaerztin-weiterbildung-frauenheilkunde-geburtshilfe-151139695'
    ];

    console.log('\n🔍 Checking if test URLs exist in database:');
    for (const url of testUrls) {
        const { data, error } = await supabase
            .from('jobs')
            .select('id, title')
            .eq('rss_guid', url)
            .maybeSingle();

        if (error) {
            console.error(`Error checking ${url}:`, error);
        } else if (data) {
            console.log(`✅ EXISTS: ${data.title}`);
        } else {
            console.log(`❌ NOT FOUND: ${url}`);
        }
    }
}

checkXingJobs().then(() => {
    console.log('\nDone!');
    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
