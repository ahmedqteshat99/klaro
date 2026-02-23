#!/usr/bin/env node
// Backfill trigger script for backfill-job-fields.
// Auth modes:
// 1) Cron secret: CRON_SECRET=... node trigger-backfill.mjs
// 2) Admin login: ADMIN_EMAIL=... ADMIN_PASSWORD=... node trigger-backfill.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://sfmgdvjwmoxoeqmcarbv.supabase.co";
const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbWdkdmp3bW94b2VxbWNhcmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjE5OTMsImV4cCI6MjA4NTUzNzk5M30.yyzU7Vwa1LBlcIlj1sJwb8Vtsb3DX__6JkKcCGmYlJw";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const cronSecret = process.env.CRON_SECRET?.trim();

const configuredBatchSize = Number(process.env.BACKFILL_BATCH_SIZE) || 100;
const batchSize = Math.min(Math.max(configuredBatchSize, 1), 200);
const configuredMaxAttempts = Number(process.env.MAX_BACKFILL_ATTEMPTS) || 2;
const maxAttempts = Math.min(Math.max(configuredMaxAttempts, 1), 5);
const maxNoProgressBatches = Math.max(Number(process.env.MAX_NO_PROGRESS_BATCHES) || 2, 1);
const useCronAuth = Boolean(cronSecret);

if (!useCronAuth && (!email || !password)) {
    console.error("❌ Missing auth settings");
    console.error("   Option 1 (recommended): CRON_SECRET=... node trigger-backfill.mjs");
    console.error("   Option 2: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpassword node trigger-backfill.mjs");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let token = "";

if (useCronAuth) {
    console.log("🔐 Using cron-secret auth");
} else {
    console.log(`🔐 Signing in as ${email}...`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (authError || !authData?.session) {
        console.error("❌ Login failed:", authError?.message ?? "No session returned");
        process.exit(1);
    }

    token = authData.session.access_token;
    console.log("✅ Signed in successfully");
}

let batch = 1;
let totalUpdated = 0;
let totalSkipped = 0;
let totalFailed = 0;
let totalRuleBased = 0;
let totalAiBased = 0;
let totalAiFallbackCalls = 0;
let noProgressStreak = 0;

while (true) {
    console.log(`\n🚀 Running batch ${batch} (up to ${batchSize} jobs, maxAttempts=${maxAttempts})...`);

    const headers = {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    };
    if (useCronAuth) {
        headers["x-cron-secret"] = cronSecret;
    } else {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        `${SUPABASE_URL}/functions/v1/backfill-job-fields`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({ batchSize, maxAttempts }),
        }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
        console.error("❌ Backfill error:", result);
        break;
    }

    console.log(`   Total in this batch: ${result.total}`);
    console.log(`   ✅ Updated: ${result.updated}`);
    console.log(`   ⏭️  Skipped (no dept found): ${result.skipped}`);
    console.log(`   ❌ Failed: ${result.failed}`);
    if (result.classified_by_rules != null) {
        console.log(`   🧭 Classified by rules: ${result.classified_by_rules}`);
    }
    if (result.classified_by_ai != null) {
        console.log(`   🤖 Classified by AI: ${result.classified_by_ai}`);
    }
    if (result.ai_fallback_calls != null) {
        console.log(`   🧠 AI fallback calls: ${result.ai_fallback_calls}`);
    }
    console.log(`   📝 ${result.message}`);

    totalUpdated += result.updated ?? 0;
    totalSkipped += result.skipped ?? 0;
    totalFailed += result.failed ?? 0;
    totalRuleBased += result.classified_by_rules ?? 0;
    totalAiBased += result.classified_by_ai ?? 0;
    totalAiFallbackCalls += result.ai_fallback_calls ?? 0;

    if (!result.total || result.total === 0) {
        console.log("\n🎉 All done! No more jobs to backfill.");
        break;
    }

    if ((result.updated ?? 0) === 0 && (result.failed ?? 0) === 0) {
        noProgressStreak++;
    } else {
        noProgressStreak = 0;
    }

    if (noProgressStreak >= maxNoProgressBatches) {
        console.log(
            `\n⏹️  Stopping after ${noProgressStreak} no-progress batches to avoid reprocessing the same records.`
        );
        break;
    }

    batch++;
    await new Promise((r) => setTimeout(r, 3000));
}

console.log("\n─────────────────────────────");
console.log("📊 Overall summary:");
console.log(`   Updated:  ${totalUpdated}`);
console.log(`   Skipped:  ${totalSkipped}`);
console.log(`   Failed:   ${totalFailed}`);
console.log(`   Rules:    ${totalRuleBased}`);
console.log(`   AI:       ${totalAiBased}`);
console.log(`   AI calls: ${totalAiFallbackCalls}`);
console.log("─────────────────────────────");
