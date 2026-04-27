/* Sprint Performance Calculator - Core Engine
 * -------------------------------------------------------
 * Plain JS, no dependencies. Loaded as a regular <script>.
 * Exposes window.SC.calculator with:
 *   - DISTANCES                    list of supported distances
 *   - START_TYPES, TIMING_METHODS  list of supported options
 *   - HAND_TIME_FAT_DELTA          +0.24s per spec
 *   - estimate(input)              main calculation entry point
 *   - mphFromMs / msFromMph etc.   small unit helpers
 *
 * Conversion model (preserved from prior version):
 *   1) Normalize input to FAT, static-start equivalent.
 *   2) Scale to other distances using REF proportions.
 *   3) If user provides a top speed, blend in a max-speed-aware
 *      correction: more weight at long distances, less at short.
 */
(function () {
  "use strict";

  var YARD_M = 0.9144;

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

  // Fraction of each distance spent near max velocity (rough physics model).
  // Short sprints are mostly acceleration; long sprints have a longer
  // max-velocity segment. 200m drops slightly because of speed endurance fade.
  var FRAC_AT_MAX_SPEED = {
    "10y":  0.00,
    "20y":  0.10,
    "30y":  0.25,
    "30m":  0.30,
    "40y":  0.40,
    "60y":  0.55,
    "60m":  0.60,
    "100m": 0.70,
    "200m": 0.62
  };

  // Multipliers used to estimate top speed from average speed at the input
  // distance. Shorter distances under-represent peak velocity.
  function topSpeedFactor(srcKey) {
    if (srcKey === "10y") return 1.45;
    if (srcKey === "20y") return 1.30;
    if (srcKey === "30y" || srcKey === "30m") return 1.18;
    if (srcKey === "40y") return 1.16;
    if (srcKey === "60y" || srcKey === "60m") return 1.08;
    if (srcKey === "100m") return 1.06;
    return 1.04;
  }

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

  var START_TYPES = [
    { key: "block",    label: "Block start" },
    { key: "3point",   label: "3-point start" },
    { key: "standing", label: "Standing start" },
    { key: "rolling",  label: "Rolling start" },
    { key: "flying",   label: "Flying start" }
  ];
  var START_ADJUST_TO_STATIC = {
    block:    0.00,
    "3point": 0.00,
    standing: -0.08,
    rolling:  0.30,
    flying:   0.65
  };

  var TIMING_METHODS = [
    { key: "fat",   label: "Fully automatic timing (FAT)" },
    { key: "laser", label: "Laser timed" },
    { key: "hand",  label: "Hand timed" },
    { key: "phone", label: "Phone video estimate" }
  ];
  var HAND_TIME_FAT_DELTA = 0.24;
  var TIMING_ADJUST_TO_FAT = {
    fat:   0.00,
    laser: 0.00,
    hand:  HAND_TIME_FAT_DELTA,
    phone: 0.15
  };

  function round(v, digits) {
    if (v === null || v === undefined || isNaN(v)) return null;
    var p = Math.pow(10, digits || 2);
    return Math.round(v * p) / p;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function mphFromMs(ms)  { return ms * 2.2369362921; }
  function kmhFromMs(ms)  { return ms * 3.6; }
  function msFromMph(mph) { return mph / 2.2369362921; }

  function normalizeTime(input) {
    var t = input.time;
    var timing = TIMING_ADJUST_TO_FAT[input.timing] || 0;
    var start  = START_ADJUST_TO_STATIC[input.startType] || 0;
    if (input.applyHandTimeAdjustment && input.timing !== "hand") {
      timing += HAND_TIME_FAT_DELTA;
    }
    return t + timing + start;
  }

  function scaleByRef(timeNormSrc, srcKey, dstKey) {
    var refSrc = REF[srcKey];
    var refDst = REF[dstKey];
    if (!refSrc || !refDst) return null;
    return timeNormSrc * (refDst / refSrc);
  }

  /**
   * Apply a max-speed-aware correction to a baseline time at distance dstKey.
   * speedRatio = userMaxSpeed / impliedMaxSpeed (from baseline model).
   * The correction stretches/compresses the max-speed portion of the run only;
   * acceleration time stays roughly the same.
   *   newTime = baseline * (1 - frac + frac / speedRatio)
   */
  function applyMaxSpeedCorrection(baselineTime, dstKey, speedRatio) {
    var frac = FRAC_AT_MAX_SPEED[dstKey];
    if (frac === undefined) frac = 0.5;
    return baselineTime * (1 - frac + frac / speedRatio);
  }

  /** Top speed for the displayed metric (m/s). Prefers user input. */
  function estimateTopSpeed(input, normalizedTime, srcKey) {
    if (input.flying20m && input.flying20m > 0) return 20 / input.flying20m;
    if (input.flying10m && input.flying10m > 0) return 10 / input.flying10m;
    if (input.topSpeed && input.topSpeed > 0)   return input.topSpeed;
    var meters = DISTANCE_BY_KEY[srcKey].meters;
    var avgV = meters / normalizedTime;
    return avgV * topSpeedFactor(srcKey);
  }

  function computeSubScores(estimates, topSpeedMs) {
    function lerp(t, lo, hi) {
      var raw = 25 + (lo - t) * (70 / (lo - hi));
      return Math.round(clamp(raw, 5, 99));
    }
    var accel = lerp(estimates["10y"], 1.95, 1.45);
    var maxVel = topSpeedMs ? lerp(topSpeedMs, 7.0, 11.5) : lerp(estimates["100m"], 13.5, 10.0);
    var endurance = lerp(estimates["200m"], 28.0, 20.0);
    function tierFromScore(s) {
      if (s >= 90) return "Elite";
      if (s >= 75) return "Advanced";
      if (s >= 55) return "Competitive";
      return "Developing";
    }
    return {
      acceleration:   { score: accel,     tier: tierFromScore(accel) },
      maxVelocity:    { score: maxVel,    tier: tierFromScore(maxVel) },
      speedEndurance: { score: endurance, tier: tierFromScore(endurance) }
    };
  }

  function computeConfidence(input) {
    var hasSplit = !!(input.split10y || input.split20y || input.flying10m ||
                      input.flying20m || input.block30m);
    var hasTopSpeed = !!(input.topSpeed || input.flying10m || input.flying20m);
    var movingStart = (input.startType === "rolling" || input.startType === "flying");
    var weakTiming  = (input.timing === "hand" || input.timing === "phone");

    if (input.timing === "phone") return rate("low",
      "Phone video estimates have high frame-rate uncertainty and start-detection error.");
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

  function findBenchmark(profile, distanceKey) {
    var list = (typeof window !== "undefined" && window.SC_BENCHMARKS) || [];
    if (!profile || !distanceKey) return null;
    var distStr = distanceKey === "60y" ? "60yd"
                 : distanceKey === "40y" ? "40yd"
                 : distanceKey === "30m" ? "30m"
                 : distanceKey;
    if (profile.sport === "soccer" && (distanceKey === "30y" || distanceKey === "30m")) distStr = "30m";
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b.confidence === "placeholder") continue;
      if (b.sport !== profile.sport) continue;
      if (b.distance !== distStr) continue;
      if (profile.sex && profile.sex !== "not specified" && b.sex && b.sex !== profile.sex) continue;
      return b;
    }
    return null;
  }

  function tierFromBenchmark(time, b) {
    if (!b || time === null || time === undefined || isNaN(time)) return null;
    if (time <= b.elite)        return "Elite";
    if (time <= b.advanced)     return "Advanced";
    if (time <= b.competitive)  return "Competitive";
    if (time <= b.developing)   return "Developing";
    return "Below listed range";
  }

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

    // Decide whether to apply max-speed correction.
    var srcMeters = DISTANCE_BY_KEY[srcKey].meters;
    var srcAvgV = srcMeters / normT;
    var impliedMaxV = srcAvgV * topSpeedFactor(srcKey);
    var hasUserMax = !!(input.topSpeed && input.topSpeed > 0);
    var speedRatio = 1;
    var conflict = false;

    if (hasUserMax) {
      // If the user's max speed is below the average speed they actually ran,
      // the input is internally inconsistent - flag it.
      if (srcAvgV > input.topSpeed * 1.02) {
        conflict = true;
        warnings.push("Your top speed input conflicts with your sprint time. The estimate may be unreliable. Check whether the speed reading is peak speed, average speed, speed at a marker, or from a different run.");
      }
      speedRatio = input.topSpeed / impliedMaxV;
      // Clamp so a wildly off input doesn't produce absurd long-distance times.
      speedRatio = clamp(speedRatio, 0.70, 1.60);
    }

    var estimates = {};
    DISTANCES.forEach(function (d) {
      var t;
      if (d.key === srcKey) {
        // Anchor the source distance to the user's normalized input. Max
        // speed never overrides the known time.
        t = normT;
      } else {
        t = scaleByRef(normT, srcKey, d.key);
        if (hasUserMax) {
          t = applyMaxSpeedCorrection(t, d.key, speedRatio);
          // Physical floor: cannot run a segment faster than user's max speed
          // would physically allow even if they hit max instantly.
          var floor = DISTANCE_BY_KEY[d.key].meters / input.topSpeed;
          if (t < floor) t = floor;
        }
      }
      estimates[d.key] = round(t, 2);
    });

    var avgMs = srcMeters / normT;
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

    var benchmark = null;
    if (input.profile && input.profile.sport && input.profile.sport !== "general athlete") {
      var bDist = (input.profile.sport === "baseball") ? "60y"
                 : (input.profile.sport === "soccer") ? (srcKey === "30m" ? "30m" : "30y")
                 : (input.profile.sport === "football") ? "40y"
                 : srcKey;
      var bMatch = findBenchmark(input.profile, bDist);
      if (bMatch) {
        var compareTime = estimates[bDist];
        if (compareTime === null || compareTime === undefined) {
          compareTime = round(scaleByRef(normT, srcKey, bDist), 2);
        }
        var tier = tierFromBenchmark(compareTime, bMatch);
        benchmark = { match: bMatch, comparedDistance: bDist, comparedTime: compareTime, tier: tier };
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
      srcKey: srcKey,
      maxSpeedApplied: hasUserMax,
      speedRatioUsed: hasUserMax ? round(speedRatio, 3) : null,
      conflict: conflict
    };
  }

  var api = {
    DISTANCES: DISTANCES,
    DISTANCE_BY_KEY: DISTANCE_BY_KEY,
    START_TYPES: START_TYPES,
    TIMING_METHODS: TIMING_METHODS,
    REALISTIC_BOUNDS: REALISTIC_BOUNDS,
    HAND_TIME_FAT_DELTA: HAND_TIME_FAT_DELTA,
    FRAC_AT_MAX_SPEED: FRAC_AT_MAX_SPEED,
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
