/* Sprint Performance Calculator - Input Validation
 * -------------------------------------------------------
 * Plain JS, no dependencies. Validates the calculator form and produces
 * { valid, errors, normalized } so callers can decide whether to compute.
 */
(function () {
  "use strict";

  function parsePositiveNumber(v, fieldLabel, errors) {
    if (v === null || v === undefined || v === "") return null;
    var n = Number(v);
    if (isNaN(n) || !isFinite(n)) {
      errors.push(fieldLabel + " must be a number.");
      return null;
    }
    if (n <= 0) {
      errors.push(fieldLabel + " must be greater than zero.");
      return null;
    }
    return n;
  }

  function validate(raw) {
    var errors = [];
    var calc = window.SC && window.SC.calculator;

    if (!raw || typeof raw !== "object") {
      return { valid: false, errors: ["No input provided."], normalized: null };
    }

    if (!raw.distance) errors.push("Choose a distance.");
    else if (calc && !calc.DISTANCE_BY_KEY[raw.distance]) errors.push("Unsupported distance.");

    var time = parsePositiveNumber(raw.time, "Time", errors);
    if (time === null && !errors.length) errors.push("Enter the time in seconds.");

    if (!raw.timing) errors.push("Pick a timing method.");
    if (!raw.startType) errors.push("Pick a start type.");

    var topSpeedMs = null;
    if (raw.topSpeed !== "" && raw.topSpeed !== undefined && raw.topSpeed !== null) {
      var topSpeed = parsePositiveNumber(raw.topSpeed, "Top speed", errors);
      if (topSpeed !== null) {
        var unit = raw.topSpeedUnit || "mph";
        if (unit === "mph") topSpeedMs = topSpeed / 2.2369362921;
        else if (unit === "ms") topSpeedMs = topSpeed;
        else errors.push("Choose a valid top-speed unit.");
        if (topSpeedMs !== null && (topSpeedMs < 3 || topSpeedMs > 14)) {
          errors.push("Top speed is outside a realistic sprint range.");
        }
      }
    }

    function optionalSplit(field, label, min, max) {
      if (raw[field] === "" || raw[field] === undefined || raw[field] === null) return null;
      var n = parsePositiveNumber(raw[field], label, errors);
      if (n !== null && (n < min || n > max)) {
        errors.push(label + " is outside a realistic range.");
        return null;
      }
      return n;
    }

    var split10y = optionalSplit("split10y", "10-yard split", 0.8, 4.5);
    var split20y = optionalSplit("split20y", "20-yard split", 1.5, 6.0);
    var flying10m = optionalSplit("flying10m", "Flying 10m", 0.7, 3.5);
    var flying20m = optionalSplit("flying20m", "Flying 20m", 1.4, 7.0);
    var block30m = optionalSplit("block30m", "30m block time", 2.8, 8.5);

    var profile = null;
    if (raw.profile && typeof raw.profile === "object") {
      profile = {
        ageGroup: raw.profile.ageGroup || null,
        sex: raw.profile.sex || null,
        sport: raw.profile.sport || null,
        position: raw.profile.position || null
      };
    }

    if (errors.length) return { valid: false, errors: errors, normalized: null };

    return {
      valid: true,
      errors: [],
      normalized: {
        distance: raw.distance,
        time: time,
        timing: raw.timing,
        startType: raw.startType,
        applyHandTimeAdjustment: !!raw.applyHandTimeAdjustment,
        topSpeed: topSpeedMs,
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
  if (typeof module !== "undefined" && module.exports) module.exports = { validate: validate };
})();
