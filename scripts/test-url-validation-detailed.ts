// Simulate the URL validation logic from the scraper

const testUrl = "https://karriere.charite.de/stellenangebote/detail/6756";

console.log(`\n🧪 Testing URL validation for: ${testUrl}\n`);

// Step 1: URL Pattern Check
console.log("Step 1: URL Pattern Check");

const patterns = [
  { name: "stelle/job/position pattern", regex: /\/(stelle|job|position|vacancy|karriere)(?:n|angebot)?\/[^\/]+/i },
  { name: "detail pattern", regex: /\/detail\/\d+/i },
  { name: "anzeige pattern", regex: /\/anzeige\/\d+/i },
  { name: "stellenangebot pattern", regex: /stellenangebot.*\d+/i },
];

patterns.forEach(({name, regex}) => {
  const matches = regex.test(testUrl);
  console.log(`  ${matches ? '✅' : '❌'} ${name}: ${matches}`);
});

const isJobUrl = patterns.some(({regex}) => regex.test(testUrl));
console.log(`\n  Overall: ${isJobUrl ? '✅ PASS' : '❌ FAIL'}`);

// Step 2: Check for assistenzarzt pattern
console.log("\nStep 2: Assistenzarzt URL Pattern Check");
const hasJobIndicator =
  /\/(job|stelle|position|vacancy)[/-]?\d+/i.test(testUrl) ||
  /\/(assistenzarzt|arzt|facharzt|oberarzt)[/-][a-z0-9-]+/i.test(testUrl) ||
  /\/vacancies\/\d+/i.test(testUrl) ||
  /\/apply\/\d+/i.test(testUrl) ||
  /softgarden\.io.*\/job/i.test(testUrl) ||
  /personio\.de.*\/job/i.test(testUrl) ||
  /successfactors\..*\/jobdetail/i.test(testUrl) ||
  (/\/(stelle|job|position)[ns]?\/[^\/]+/i.test(testUrl) && !/\/(stelle|job|position)[ns]?\/?$/i.test(testUrl)) ||
  (/assistenzarzt/i.test(testUrl) && testUrl.split('/').length > 4);

console.log(`  ${hasJobIndicator ? '✅' : '❌'} Has job indicator: ${hasJobIndicator}`);

if (!hasJobIndicator) {
  console.log("\n❌ FAILED: URL pattern validation");
  console.log("This URL would be rejected before HTTP validation");
}

