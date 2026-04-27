/* Sprint Performance Calculator - Copy & Share Helpers */
(function () {
  "use strict";

  var SHARE_KEYS = [
    "distance", "time", "timing", "startType", "applyHandTimeAdjustment",
    "topSpeed", "topSpeedUnit",
    "split10y", "split20y", "flying10m", "flying20m", "block30m",
    "ageGroup", "sex", "sport", "position"
  ];

  function copyResultsToClipboard(text) {
    if (!text) return Promise.reject(new Error("nothing to copy"));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error("copy failed"));
      } catch (e) { reject(e); }
    });
  }

  function buildShareUrl(formState) {
    var params = new URLSearchParams();
    SHARE_KEYS.forEach(function (k) {
      var v = formState[k];
      if (v === null || v === undefined || v === "") return;
      if (typeof v === "boolean") { if (v) params.set(k, "1"); return; }
      params.set(k, String(v));
    });
    var url = window.location.origin + window.location.pathname;
    var qs = params.toString();
    return qs ? (url + "?" + qs) : url;
  }

  function readShareUrl(searchString) {
    var params = new URLSearchParams(searchString || window.location.search);
    var out = {};
    SHARE_KEYS.forEach(function (k) {
      if (params.has(k)) {
        out[k] = (k === "applyHandTimeAdjustment") ? (params.get(k) === "1") : params.get(k);
      }
    });
    return out;
  }

  function buildResultText(input, result) {
    var lines = [];
    lines.push("Sprint Performance Calculator - estimate");
    lines.push("Input: " + input.distance + " in " + input.time + "s (" + input.timing + ", " + input.startType + " start)");
    lines.push("Confidence: " + result.confidence.level.toUpperCase() + " - " + result.confidence.explanation);
    lines.push("");
    lines.push("Estimated splits / conversions:");
    Object.keys(result.estimates).forEach(function (k) {
      lines.push("  " + k.padEnd(5, " ") + " = " + result.estimates[k] + "s");
    });
    lines.push("");
    lines.push("Speeds (avg over input distance): " + result.speeds.avgMph + " mph / " + result.speeds.avgMs + " m/s / " + result.speeds.avgKmh + " km/h");
    if (result.speeds.topMph) {
      lines.push("Estimated top speed: " + result.speeds.topMph + " mph / " + result.speeds.topMs + " m/s");
    }
    lines.push("");
    lines.push("Acceleration: "    + result.subScores.acceleration.tier   + " (" + result.subScores.acceleration.score   + ")");
    lines.push("Max velocity: "    + result.subScores.maxVelocity.tier    + " (" + result.subScores.maxVelocity.score    + ")");
    lines.push("Speed endurance: " + result.subScores.speedEndurance.tier + " (" + result.subScores.speedEndurance.score + ")");
    if (result.benchmark) {
      lines.push("");
      lines.push("Benchmark tier (" + result.benchmark.match.sport + " " + result.benchmark.match.distance + "): " + (result.benchmark.tier || "n/a"));
      lines.push("Source: " + result.benchmark.match.sourceName);
    }
    lines.push("");
    lines.push("These are estimates, not official marks. Source: Sprint Performance Calculator.");
    return lines.join("\n");
  }

  function readForm(form) {
    var fd = new FormData(form);
    var obj = {};
    SHARE_KEYS.forEach(function (k) {
      var v = fd.get(k);
      if (k === "applyHandTimeAdjustment") obj[k] = !!v;
      else obj[k] = v === null ? "" : v;
    });
    obj.profile = {
      ageGroup: obj.ageGroup || null,
      sex: obj.sex || null,
      sport: obj.sport || null,
      position: obj.position || null
    };
    return obj;
  }

  function applyDefaults(form, defaults) {
    if (!form || !defaults) return;
    Object.keys(defaults).forEach(function (k) {
      if (!SHARE_KEYS.includes(k)) return;
      var input = form.querySelector("[name='" + k + "']");
      if (!input) return;
      if (input.type === "checkbox") {
        input.checked = (defaults[k] === true || defaults[k] === "1" || defaults[k] === "true");
      } else {
        input.value = defaults[k];
      }
    });
  }

  function bootstrapCalculator(options) {
    options = options || {};
    var form     = document.getElementById(options.formId    || "sc-form");
    var results  = document.getElementById(options.resultsId || "sc-results");
    var errors   = document.getElementById(options.errorsId  || "sc-errors");
    if (!form || !results || !errors) return;

    var urlState = readShareUrl();
    var hasUrl = Object.keys(urlState).length > 0;
    applyDefaults(form, hasUrl ? urlState : (options.defaults || {}));

    var lastInput = null;
    var lastResult = null;

    form.addEventListener("submit", function (e) { e.preventDefault(); compute(); });

    form.addEventListener("reset", function () {
      setTimeout(function () {
        results.innerHTML = "";
        errors.innerHTML = "";
        lastInput = lastResult = null;
        if (options.revealId) {
          var wrap = document.getElementById(options.revealId);
          if (wrap) wrap.setAttribute("hidden", "");
        }
        if (options.defaults) applyDefaults(form, options.defaults);
      }, 0);
    });

    results.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("[data-sc-action]");
      if (!t) return;
      if (!lastResult) return;
      var status = results.querySelector(".share-status");
      if (t.getAttribute("data-sc-action") === "copy") {
        copyResultsToClipboard(buildResultText(lastInput, lastResult))
          .then(function () { if (status) status.textContent = "Results copied to clipboard."; })
          .catch(function ()  { if (status) status.textContent = "Could not copy. Select the text above to copy manually."; });
      } else if (t.getAttribute("data-sc-action") === "share") {
        var formState = readForm(form);
        copyResultsToClipboard(buildShareUrl(formState))
          .then(function () { if (status) status.textContent = "Share link copied - paste it anywhere."; })
          .catch(function ()  { if (status) status.textContent = "Could not copy share link."; });
      }
    });

    function compute() {
      errors.innerHTML = "";
      var raw = readForm(form);
      var v = window.SC.validation.validate(raw);
      if (!v.valid) {
        var ul = document.createElement("ul");
        v.errors.forEach(function (msg) {
          var li = document.createElement("li"); li.textContent = msg; ul.appendChild(li);
        });
        errors.appendChild(ul);
        try { errors.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (e) {}
        return;
      }
      try {
        var result = window.SC.calculator.estimate(v.normalized);
        lastInput = v.normalized; lastResult = result;
        results.innerHTML = "";
        results.appendChild(window.SC.benchmarks.renderResults(v.normalized, result));
        if (options.onResult) options.onResult(v.normalized, result);

        if (options.revealId) {
          var wrap = document.getElementById(options.revealId);
          if (wrap && wrap.hasAttribute("hidden")) wrap.removeAttribute("hidden");
        }
        if (options.scrollOnResult !== false) {
          // Scroll to the actual generated cards, not the wrapper heading.
          var target = options.scrollTargetId
            ? (document.getElementById(options.scrollTargetId) || results)
            : results;
          var prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          // Wait one frame so the unhide layout has settled before scrolling.
          requestAnimationFrame(function () {
            try {
              target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
            } catch (e) { target.scrollIntoView(); }
          });
        }
      } catch (err) {
        errors.textContent = "Something went wrong: " + (err && err.message ? err.message : "unknown error");
      }
    }

    if (hasUrl && urlState.distance && urlState.time) compute();
  }

  if (typeof window !== "undefined") {
    window.SC = window.SC || {};
    window.SC.share = {
      copyResultsToClipboard: copyResultsToClipboard,
      buildShareUrl: buildShareUrl,
      readShareUrl: readShareUrl,
      buildResultText: buildResultText,
      readForm: readForm,
      applyDefaults: applyDefaults,
      bootstrapCalculator: bootstrapCalculator,
      SHARE_KEYS: SHARE_KEYS
    };
  }
})();
