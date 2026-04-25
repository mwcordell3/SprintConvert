/* Sprint Performance Calculator — Core Engine
 * -------------------------------------------------------
 * Plain JS, no dependencies. Loaded as a regular <script>.
 * Exposes window.SC.calculator with:
 *   - DISTANCES                    list of supported distances
 *   - START_TYPES, TIMING_METHODS  list of supported options
 *   - HAND_TIME_FAT_DELTA          +0.24s per spec
 *   - estimate(input)              main calculation entry point
 *   - mphFromMs / msFromMph etc.   small unit helpers
 *
 * IMPORTANT: This is an estimation tool. Sprint performance is not linear,
 * and start type / timing method change results meaningfully. Outputs are
 * approximations, not official marks.
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  // 1 yard = 0.9144 meters
  var YARD_M = 0.9144;

  // Reference splits for a "competitive" male athlete with FAT timing and a
  // static start (block / 3-point). Lower-confidence relationships, used only
  // for proportional scaling between distances. Times in seconds.
  // Cross-checked against published 100m-split tables and combine data.
  var REF = {
    "10y":  1.65,
    "20y":  2.70,
    "30y":  3.65,
    "30m":  3.95,
    "40y":  4.70,
    "60y":  6.55,
    "60m":  7.10,
    "100m": 11.50,
    "200m": 23.50
  };

  // Distance metadata (label, meters, key, kind).
  // 30m is supported primarily for the soccer 30m test; the homepage form
  // does not list it but sport-specific pages can add it.
  var DISTANCES = [
    { key: "10y",  label: "10 yards",   meters: 10  * YARD_M, kind: "yard" },
    { key: "20y",  label: "20 yards",   meters: 20  * YARD_M, kind: "yard" },
    { key: "30y",  label: "30 yards",   meters: 30  * YARD_M, kind: "yard" },
    { key: "30m",  label: "30 meters",  meters: 30,           kind: "meter" },
    { key: "40y",  label: "40 yards",   meters: 40  * YARD_M, kind: "yard" },
    { key: "60y",  label: "60 yards",   meters: 60  * YARD_M, kind: "yard" },
    { key: "60m",  label: "60 meters",  meters: 60,           kind: "meter" },
    { key: "100m", label: "100 meters", meters: 100,          kind: "meter" },
    { key: "200m", label: "200 meters", meters: 200,          kind: "meter" }
  ];
  var DISTANCE_BY_KEY = {};
  DISTANCES.forEach(function (d) { DISTANCE_BY_KEY[d.key] = d; });

  // Realistic input bounds (very loose; we only reject obvious nonsense).
  // These are wider than world records on the fast side because the user could
  // pick the wrong distance label or be wildly off; we warn rather than reject.
  var REALISTIC_BOUNDS = {
    "10y":  { min: 1.20, max: 4.50 },
    "20y":  { min: 2.00, max: 6.00 },
    "30y":  { min: 2.80, max: 8.00 },
    "30m":  { min: 3.00, max: 8.50 },
    "40y":  { min: 3.80, max: 9.50 },
    "60y":  { min: 5.50, max: 12.0 },
    "60m":  { min: 6.00, max: 13.0 },
    "100m": { min: 9.00, max: 22.0 },
    "200m": { min: 18.0, max: 45.0 }
  };

  // Start types: list (used to render selects) and adjustment to "static start"
  // baseline. Adding the value normalizes the user's time so we can scale to
  // other distances on a comparable footing.
  // Static = block / 3-point / standing (athlete starts from rest).
  // Moving = rolling / flying (athlete is already moving when timing begins).
  var START_TYPES = [
    { key: "block",    label: "Block start" },
    { key: "3point",   label: "3-point start" },
    { key: "standing", label: "Standing start" },
    { key: "rolling",  label: "Rolling start" },
    { key: "flying",   label: "Flying start" }
  ];
  var START_ADJUST_TO_STATIC = {
    block:    0.00,   // baseline
    "3point": 0.00,   // treat ~equal to block for v1; small real difference
    standing: -0.08,  // standing tests appear ~0.08s slower from upright
    rolling:  0.30,   // already moving — add ~0.30s to get static-equivalent
    flying:   0.65    // already at speed — add ~0.65s to short-sprint times
  };

  // Timing methods: hand reads faster than FAT by ~0.24s for typical track
  // hand-timing (per IAAF/NCAA conversion convention). Phone video is treated
  // as roughly hand-time accuracy. Laser ~ FAT.
  var TIMING_METHODS = [
    { key: "fat",   label: "Fully automatic timing (FAT)" },
    { key: "laser", label: "Laser timed" },
    { key: "hand",  label: "Hand timed" },
    { key: "phone", label: "Phone video estimate" }
  ];
  var HAND_TIME_FAT_DELTA = 0.24; // seconds, per spec
  var TIMING_ADJUST_TO_FAT = {
    fat:   0.00,
    laser: 0.00,
    hand:  HAND_TIME_FAT_DELTA,
    phone: 0.15 // rougher than hand stopwatch on average
  };

  // Round helper
  function round(v, digits) {
    if (v === null || v === undefined || isNaN(v)) return null;
    var p = Math.pow(10, digits || 2);
    return Math.round(v * p) / p;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // Unit helpers
  function mphFromMs(ms)  { return ms * 2.2369362921; }
  function kmhFromMs(ms)  { return ms * 3.6; }
  function msFromMph(mph) { return mph / 2.2369362921; }

  // ---------------------------------------------------------------------------
  // Core estimation
  // ---------------------------------------------------------------------------

  /**
   * Normalize user time to "FAT, static start" baseline.
   * Returns the time-equivalent if the user had used FAT and a static
   * (block/3-point) start.
   */
  function normalizeTime(input) {
    var t = input.time;
    var timing = TIMING_ADJUST_TO_FAT[input.timing] || 0;
    var start  = START_ADJUST_TO_STATIC[input.startType] || 0;
    // The optional checkbox "Apply estimated hand-time adjustment" forces the
    // hand-time delta even if timing wasn't marked hand. Useful for combine
    // hand-timed numbers entered by parents who clicked "FAT" by mistake.
    if (input.applyHandTimeAdjustment && input.timing !== "hand") {
      timing += HAND_TIME_FAT_DELTA;
    }
    return t + timing + start;
  }

  /**
   * Scale a normalized time at distance `srcKey` to an estimated normalized
   * time at distance `dstKey` using reference proportions.
   */
  function scaleByRef(timeNormSrc, srcKey, dstKey) {
    var refSrc = REF[srcKey];
    var refDst = REF[dstKey];
    if (!refSrc || !refDst) return null;
    return timeNormSrc * (refDst / refSrc);
  }

  /**
   * Estimate top speed (m/s) from sprint splits or distance/time.
   * If user gave flying-10 or flying-20, prefer that (it's near max velocity).
   * Otherwise estimate via 30m-40y differential, else fall back to a fraction
   * of average velocity scaled to typical max-velocity ratios.
   */
  function estimateTopSpeed(input, normalizedTime, srcKey) {
    if (input.flying20m && input.flying20m > 0) {
      return 20 / input.flying20m;
    }
    if (input.flying10m && input.flying10m > 0) {
      return 10 / input.flying10m;
    }
    if (input.topSpeed && input.topSpeed > 0) {
      // user-provided in m/s
      return input.topSpeed;
    }
    // Fallback: max velocity ~ avg velocity * factor depending on distance
    var meters = DISTANCE_BY_KEY[srcKey].meters;
    var avgV = meters / normalizedTime;
    // Shorter input distances under-represent max velocity (athlete still
    // accelerating), so we apply a stronger amplification at 10y/20y.
    var factor;
    if (srcKey === "10y") factor = 1.45;
    else if (srcKey === "20y") factor = 1.30;
    else if (srcKey === "30y" || srcKey === "30m") factor = 1.18;
    else if (srcKey === "40y") factor = 1.16;
    else if (srcKey === "60y" || srcKey === "60m") factor = 1.08;
    else if (srcKey === "100m") factor = 1.06;
    else factor = 1.04;
    return avgV * factor;
  }

  /**
   * Compute simple 0-100 ability scores for acceleration, max velocity,
   * and speed endurance. The "tier" ranges are deliberately broad because
   * sprint performance varies heavily by sport/sex/age. Scores are not
   * percentile rankings.
   *
   * Scores anchor against approximate "developing" (score ~ 25) and
   * "elite" (score ~ 95) values for high-school / college-age males. For
   * other groups the score is still useful as a relative gauge.
   */
  function computeSubScores(estimates, topSpeedMs) {
    function lerp(t, lo, hi) {
      // Lower estimated time => higher score; lo = developing time (~25),
      // hi = elite time (~95). Times faster than `hi` are clamped above 95.
      var raw = 25 + (lo - t) * (70 / (lo - hi));
      return Math.round(clamp(raw, 5, 99));
    }

    var accel = lerp(estimates["10y"],  1.95, 1.45); // 10y FAT static
    var maxVel = topSpeedMs
      ? lerp(topSpeedMs, 7.0, 11.5)  // m/s; faster is better, so flip args
      : null;
    if (maxVel === null) {
      // Use estimated 100m as a proxy for combined speed
      maxVel = lerp(estimates["100m"], 13.5, 10.0);
    }
    var endurance = lerp(estimates["200m"], 28.0, 20.0);

    function tierFromScore(s) {
      if (s >= 90) return "Elite";
      if (s >= 75) return "Advanced";
      if (s >= 55) return "Competitive";
      return "Developing";
    }

    return {
      acceleration:    { score: accel,     tier: tierFromScore(accel) },
      maxVelocity:     { score: maxVel,    tier: tierFromScore(maxVel) },
      speedEndurance:  { score: endurance, tier: tierFromScore(endurance) }
    };
  }

  /**
   * Determine confidence rating per the spec.
   */
  function computeConfidence(input) {
    var hasSplit = !!(input.split10y || input.split20y || input.flying10m ||
                      input.flying20m || input.block30m);
    var hasTopSpeed = !!input.topSpeed;
    var movingStart = (input.startType === "rolling" || input.startType === "flying");
    var weakTiming  = (input.timing === "hand" || input.timing === "phone");

    // Phone video estimate is always low-confidence per spec.
    if (input.timing === "phone") return rate("low",
      "Phone video estimates have high frame-rate uncertainty and start-detection error.");

    // Rolling/flying start with no other signal makes short-distance estimates
    // unreliable because the acceleration phase isn't captured.
    if (movingStart && !hasSplit && !hasTopSpeed) return rate("low",
      "Rolling/flying starts skip the acceleration phase, so short-distance estimates are rough.");

    if (weakTiming && !hasSplit && !hasTopSpeed) return rate("low",
      "Hand-timed entries can be 0.20-0.30 seconds faster than FAT and add uncertainty.");

    if (!hasSplit && !hasTopSpeed) return rate("medium",
      "One reasonable timed run with FAT/laser timing - adequate for a single estimate, but no cross-checks.");

    if ((hasSplit && hasTopSpeed) && !weakTiming && !movingStart) return rate("high",
      "FAT/laser timing plus splits and top speed lets us cross-check the acceleration and max-velocity phases.");

    return rate("medium",
      "Some additional split or top-speed data is provided, which improves the estimate beyond a single time.");

    function rate(level, why) { return { level: level, explanation: why }; }
  }

  /**
   * Pick the best benchmark match from window.SC_BENCHMARKS for a given
   * input/distance combination. Returns null if there is no good match.
   * Returning null is intentional and important - the spec requires showing
   * a "no benchmark for this profile" message rather than fabricating one.
   */
  function findBenchmark(profile, distanceKey) {
    var list = (typeof window !== "undefined" && window.SC_BENCHMARKS) || [];
    if (!profile || !distanceKey) return null;

    // Map our distance keys to benchmark distance strings.
    var distStr = distanceKey === "60y" ? "60yd"
                 : distanceKey === "40y" ? "40yd"
                 : distanceKey === "30m" ? "30m"
                 : distanceKey;

    // Allow a few aliases for soccer 30m: we'll show it on the soccer page
    // when the user enters a 30y or 30m time within reason.
    if (profile.sport === "soccer" && (distanceKey === "30y" || distanceKey === "30m")) {
      distStr = "30m";
    }

    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b.confidence === "placeholder") continue;
      if (b.sport !== profile.sport) continue;
      if (b.distance !== distStr) continue;
      // Sex must match if specified; "not specified" allows fall-through to
      // male-default benchmarks but flag the limitation in the notes UI.
      if (profile.sex && profile.sex !== "not specified" && b.sex && b.sex !== profile.sex) continue;
      return b;
    }
    return null;
  }

  /**
   * Place a time into Developing / Competitive / Advanced / Elite (or below).
   * Lower times are faster, so the comparison flips.
   */
  function tierFromBenchmark(time, b) {
    if (!b || time === null || time === undefined || isNaN(time)) return null;
    if (time <= b.elite)        return "Elite";
    if (time <= b.advanced)     return "Advanced";
    if (time <= b.competitive)  return "Competitive";
    if (time <= b.developing)   return "Developing";
    return "Below listed range";
  }

  // ---------------------------------------------------------------------------
  // Main entry
  // ---------------------------------------------------------------------------

  /**
   * input shape:
   * {
   *   distance: "40y" | "100m" | ...   (required)
   *   time:     number (seconds)        (required)
   *   timing:   "fat" | "laser" | "hand" | "phone"
   *   startType:"block" | "3point" | "standing" | "rolling" | "flying"
   *   applyHandTimeAdjustment: boolean
   *   topSpeed: number (m/s, optional)   -- input as either mph OR m/s; caller converts
   *   split10y, split20y, flying10m, flying20m, block30m: optional seconds
   *   profile: { ageGroup, sex, sport, position }
   * }
   */
  function estimate(input) {
    var warnings = [];
    if (!input || !input.distance || !DISTANCE_BY_KEY[input.distance]) {
      throw new Error("Unknown or missing distance");
    }
    if (!isFinite(input.time) || input.time <= 0) {
      throw new Error("Time must be a positive number of seconds");
    }
    var bounds = REALISTIC_BOUNDS[input.distance];
    if (bounds && (input.time < bounds.min || input.time > bounds.max)) {
      warnings.push("That time is outside typical " + DISTANCE_BY_KEY[input.distance].label +
        " range (" + bounds.min + "s - " + bounds.max + "s). Estimates may be unreliable.");
    }

    var srcKey = input.distance;
    var normT  = normalizeTime(input);

    // Estimate every supported distance
    var estimates = {};
    DISTANCES.forEach(function (d) {
      estimates[d.key] = round(scaleByRef(normT, srcKey, d.key), 2);
    });

    // Speeds: average across the input distance, then estimated top speed
    var avgMs = DISTANCE_BY_KEY[srcKey].meters / normT;
    var topMs = estimateTopSpeed(input, normT, srcKey);
    var speeds = {
      avgMs:  round(avgMs, 2),
      avgMph: round(mphFromMs(avgMs), 2),
      avgKmh: round(kmhFromMs(avgMs), 2),
      topMs:  round(topMs, 2),
      topMph: round(mphFromMs(topMs), 2),
      topKmh: round(kmhFromMs(topMs), 2)
    };

    var subScores = computeSubScores(estimates, topMs);
    var confidence = computeConfidence(input);

    // Benchmark
    var benchmark = null;
    if (input.profile && input.profile.sport && input.profile.sport !== "general athlete") {
      // Pick the most natural distance to compare:
      // football 40yd, baseball 60yd, soccer 30m (we accept 30y as proxy)
      var bDist = (input.profile.sport === "baseball") ? "60y"
                 : (input.profile.sport === "soccer") ? (srcKey === "30m" ? "30m" : "30y")
                 : (input.profile.sport === "football") ? "40y"
                 : srcKey;
      var bMatch = findBenchmark(input.profile, bDist);
      if (bMatch) {
        var compareTime = round(scaleByRef(normT, srcKey, bDist), 2);
        var tier = tierFromBenchmark(compareTime, bMatch);
        benchmark = {
          match: bMatch,
          comparedDistance: bDist,
          comparedTime: compareTime,
          tier: tier
        };
      }
    }

    return {
      estimates: estimates,
      speeds: speeds,
      subScores: subScores,
      confidence: confidence,
      benchmark: benchmark,
      warnings: warnings,
      normalizedTime: round(normT, 2),
      srcKey: srcKey
    };
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  var api = {
    DISTANCES: DISTANCES,
    DISTANCE_BY_KEY: DISTANCE_BY_KEY,
    START_TYPES: START_TYPES,
    TIMING_METHODS: TIMING_METHODS,
    REALISTIC_BOUNDS: REALISTIC_BOUNDS,
    HAND_TIME_FAT_DELTA: HAND_TIME_FAT_DELTA,
    estimate: estimate,
    findBenchmark: findBenchmark,
    tierFromBenchmark: tierFromBenchmark,
    mphFromMs: mphFromMs,
    kmhFromMs: kmhFromMs,
    msFromMph: msFromMph,
    round: round
  };

  if (typeof window !== "undefined") {
    window.SC = window.SC || {};
    window.SC.calculator = api;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
