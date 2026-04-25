/* Sprint Performance Calculator — Input Validation
 * -------------------------------------------------------
 * Plain JS, no dependencies. Validates the calculator form and produces
 * { valid, errors, normalized } so callers can decide whether to compute.
 *
 * Errors are user-facing and specific. Validation never silently coerces
 * an invalid value to a "default" — wrong inputs surface a clear message.
 */
(function () {
  "use strict";

  function isNum(v) {
    var n = Number(v);
    return !isNaN(n) && isFinite(n);
  }

  function parsePositiveNumber(v, fieldLabel, errors) {
    if (v === null || v === undefined || v === "") return null;
    var n = Number(v);
    if (isNaN(n)) {
      errors.push(fieldLabel + " must be a number.");
      return null;
    }
    if (n <= 0) {
      errors.push(fieldLabel + " must be greater than zero.");
      return null;
    }
    return n;
  }

  /**
   * Validate the full calculator input set.
   * Expected raw input:
   * {
   *   distance: "40y" | ...,
   *   time: "4.50",
   *   timing: "fat" | "hand" | "laser" | "phone",
   *   startType: "block" | ...,
   *   applyHandTimeAdjustment: true/false,
   *   topSpeed: "20.5",
   *   topSpeedUnit: "mph" | "ms",
   *   split10y, split20y, flying10m, flying20m, block30m: "1.65" etc,
   *   profile: { ageGroup, sex, sport, position }
   * }
   */
  function validate(raw) {
    var errors = [];
    var calc = window.SC && window.SC.calculator;

    if (!raw || typeof raw !== "object") {
      return { valid: false, errors: ["No input provided."], normalized: null };
    }

    if (!raw.distance) errors.push("Choose a distance.");
    else if (calc && !calc.DISTANCE_BY_KEY[raw.distance]) {
      errors.push("Unsupported distance.");
    }

    var time = parsePositiveNumber(raw.time, "Time", errors);
    if (time === null && !errors.length) {
      errors.push("Enter the time in seconds.");
    }

    if (!raw.timing) errors.push("Pick a timing method.");
    if (!raw.startType) errors.push("Pick a start type.");

    // Optional top speed: convert mph -> m/s for the engine
    var topSpeedMs = null;
    if (raw.topSpeed !== "" && raw.topSpeed !== undefined && raw.topSpeed !== null) {
      var n = parsePositiveNumber(raw.topSpeed, "Top speed", errors);
      if (n !== null) {
        if (raw.topSpeedUnit === "ms") topSpeedMs = n;
        else if (raw.topSpeedUnit === "mph") topSpeedMs = n / 2.2369362921;
        else topSpeedMs = n; // default mph if unspecified -> assume m/s here is a bit odd; keep as-is
        // Sanity bounds
        if (topSpeedMs < 3 || topSpeedMs > 14) {
          errors.push("Top speed is outside a realistic sprint range.");
        }
      }
    }

    function optionalSplit(field, label) {
      if (!raw[field] && raw[field] !== 0) return null;
      var n = parsePositiveNumber(raw[field], label, errors);
      if (n !== null && (n < 0.5 || n > 20)) {
        errors.push(label + " is outside a realistic range.");
        return null;
      }
      return n;
    }

    var split10y   = optionalSplit("split10y",   "10-yard split");
    var split20y   = optionalSplit("split20y",   "20-yard split");
    var flying10m  = optionalSplit("flying10m",  "Flying 10m");
    var flying20m  = optionalSplit("flying20m",  "Flying 20m");
    var block30m   = optionalSplit("block30m",   "30m block time");

    // Profile is optional but if any field present, normalize it.
    var profile = null;
    if (raw.profile && typeof raw.profile === "object") {
      profile = {
        ageGroup: raw.profile.ageGroup || null,
        sex:      raw.profile.sex      || null,
        sport:    raw.profile.sport    || null,
        position: raw.profile.position || null
      };
    }

    if (errors.length) {
      return { valid: false, errors: errors, normalized: null };
    }

    return {
      valid: true,
      errors: [],
      normalized: {
        distance: raw.distance,
        time: time,
        timing: raw.timing,
        startType: raw.startType,
        applyHandTimeAdjustment: !!raw.applyHandTimeAdjustment,
        topSpeed: topSpeedMs, // m/s in normalized form
        split10y: split10y,
        split20y: split20y,
        flying10m: flying10m,
        flying20m: flying20m,
        block30m: block30m,
        profile: profile
      }
    };
  }

  if (typeof window !== "undefined") {
    window.SC = window.SC || {};
    window.SC.validation = { validate: validate };
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { validate: validate };
  }
})();
