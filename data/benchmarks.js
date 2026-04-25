/* Sprint Performance Calculator — Benchmark Dataset
 * --------------------------------------------------
 * v1 contains a small, intentionally conservative set of broad
 * performance ranges. Lower times are faster.
 *
 * RULES (do not break when adding entries):
 *  - Use only sources you can cite by name and link.
 *  - Do NOT invent age/sex precision. Use broad groups.
 *  - Do NOT publish weak or unsourced data; better to show no benchmark.
 *  - confidence: "verified" (cited recruiting/test source),
 *                "general"  (widely accepted general range),
 *                "placeholder" (NEVER displayed for comparison).
 *  - Times are in seconds. Distances follow the original test format.
 */
const benchmarks = [
  {
    sport: "football",
    distance: "40yd",
    category: "general football",
    sex: "male",
    ageGroup: "high school / college",
    developing: 5.20,
    competitive: 4.90,
    advanced: 4.70,
    elite: 4.50,
    sourceName: "General football 40-yard dash standards and recruiting guidance",
    sourceUrl: "https://en.wikipedia.org/wiki/40-yard_dash",
    notes: "Widely accepted general ranges. Times vary heavily by timing method, position, and testing conditions.",
    confidence: "general"
  },
  {
    sport: "baseball",
    distance: "60yd",
    category: "high school / college recruiting",
    sex: "male",
    ageGroup: "high school / college",
    developing: 7.30,
    competitive: 7.00,
    advanced: 6.80,
    elite: 6.50,
    sourceName: "NCSA baseball recruiting speed guidelines",
    sourceUrl: "https://www.ncsasports.org/baseball/recruiting-guidelines",
    notes: "Based on recruiting benchmarks. Showcase timing and surfaces may affect results.",
    confidence: "verified"
  },
  {
    sport: "soccer",
    distance: "30m",
    category: "competitive soccer",
    sex: "male",
    ageGroup: "teen / adult",
    developing: 4.40,
    competitive: 4.20,
    advanced: 4.00,
    elite: 3.70,
    sourceName: "Soccer 30-meter sprint performance testing reference",
    sourceUrl: "https://speedendurance.com/2010/10/10/the-soccer-football-30-meter-sprint-test/",
    notes: "Ranges based on trained player data. Sprint performance varies by age, level, and testing conditions.",
    confidence: "general"
  }
];

// Expose to other scripts via global. No modules so GitHub Pages serves it as-is.
if (typeof window !== "undefined") {
  window.SC_BENCHMARKS = benchmarks;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = benchmarks;
}
