import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const CWD = process.cwd();
const OUTPUT_PATH = resolve(CWD, "public/sitemap.xml");
const MAX_JOBS = 5000;

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

const buildJobSlug = (title, hospitalName) => {
  const combined = [title, hospitalName].filter(Boolean).join(" ");
  const slug = slugify(combined || title || "job");
  return slug || "job";
};

const toIsoDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const stripOuterQuotes = (value) => {
  if (!value) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }
  return value;
};

const loadEnvFile = async (filePath) => {
  try {
    const text = await readFile(filePath, "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eqIdx = line.indexOf("=");
      if (eqIdx <= 0) continue;

      const key = line.slice(0, eqIdx).trim();
      const rawValue = line.slice(eqIdx + 1).trim();
      if (!key || process.env[key] !== undefined) continue;

      process.env[key] = stripOuterQuotes(rawValue);
    }
  } catch {
    // File may not exist in all environments.
  }
};

const resolveEnv = () => {
  const siteUrl = (process.env.VITE_PUBLIC_SITE_URL || "https://klaro.tools").replace(/\/+$/, "");
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/+$/, "");
  const supabasePublishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return { siteUrl, supabaseUrl, supabasePublishableKey };
};

const baseUrls = (siteUrl) => [
  {
    loc: `${siteUrl}/`,
    changefreq: "daily",
    priority: "1.0",
  },
  {
    loc: `${siteUrl}/jobs`,
    changefreq: "daily",
    priority: "0.9",
  },
  {
    loc: `${siteUrl}/datenschutz`,
    changefreq: "monthly",
    priority: "0.3",
  },
  {
    loc: `${siteUrl}/impressum`,
    changefreq: "monthly",
    priority: "0.3",
  },
];

const fetchPublishedJobs = async () => {
  const { supabaseUrl, supabasePublishableKey } = resolveEnv();
  if (!supabaseUrl || !supabasePublishableKey) {
    console.warn(
      "[sitemap] VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY missing. Generating base sitemap only."
    );
    return [];
  }

  const query = new URLSearchParams({
    select: "id,title,hospital_name,published_at,updated_at",
    is_published: "eq.true",
    order: "published_at.desc.nullslast",
    limit: String(MAX_JOBS),
  });

  const endpoint = `${supabaseUrl}/rest/v1/jobs?${query.toString()}`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: supabasePublishableKey,
        Authorization: `Bearer ${supabasePublishableKey}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn(`[sitemap] Supabase jobs fetch failed (${response.status}). ${body.slice(0, 300)}`);
      return [];
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) return [];
    return payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[sitemap] Supabase jobs fetch failed (network): ${message}`);
    return [];
  }
};

const buildXml = (urls) => {
  const rows = urls
    .map((url) => {
      const lastmod = url.lastmod ? `<lastmod>${escapeXml(url.lastmod)}</lastmod>` : "";
      const changefreq = url.changefreq ? `<changefreq>${escapeXml(url.changefreq)}</changefreq>` : "";
      const priority = url.priority ? `<priority>${escapeXml(url.priority)}</priority>` : "";
      return `  <url>
    <loc>${escapeXml(url.loc)}</loc>
${lastmod ? `    ${lastmod}\n` : ""}${changefreq ? `    ${changefreq}\n` : ""}${priority ? `    ${priority}\n` : ""}  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows}
</urlset>
`;
};

const run = async () => {
  await loadEnvFile(resolve(CWD, ".env.local"));
  await loadEnvFile(resolve(CWD, ".env"));

  const { siteUrl } = resolveEnv();
  const urls = [...baseUrls(siteUrl)];
  const jobs = await fetchPublishedJobs();

  for (const job of jobs) {
    if (!job?.id || !job?.title) continue;
    const slug = buildJobSlug(job.title, job.hospital_name);
    urls.push({
      loc: `${siteUrl}/jobs/${job.id}/${slug}`,
      lastmod: toIsoDate(job.updated_at || job.published_at),
      changefreq: "daily",
      priority: "0.8",
    });
  }

  const xml = buildXml(urls);
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, xml, "utf8");

  console.log(`[sitemap] Wrote ${urls.length} URL(s) to ${OUTPUT_PATH}`);
};

run().catch((error) => {
  console.error("[sitemap] Generation failed:", error);
  process.exit(1);
});
