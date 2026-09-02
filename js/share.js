/* Sprint Performance Calculator - Form, Copy & Share Helpers */
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
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
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
    return qs ? url + "?" + qs : url;
  }

  function readShareUrl(searchString) {
    var params = new URLSearchParams(searchString || window.location.search);
    var out = {};
    SHARE_KEYS.forEach(function (k) {
      if (params.has(k)) out[k] = k === "applyHandTimeAdjustment" ? params.get(k) === "1" : params.get(k);
    });
    return out;
  }

  function resultKeyLabel(key, input, result) {
    if (result && key === result.srcKey) return key + " entered";
    if (input && input.split10y && key === "10y") return key + " entered split";
    if (input && input.split20y && key === "20y") return key + " entered split";
    if (input && input.block30m && key === "30m") return key + " entered 30m";
    return key;
  }

  function buildResultText(input, result) {
    var lines = [];
    var tableEstimates = result.displayEstimates || result.estimates;
    lines.push("Sprint Performance Calculator - estimate");
    lines.push("Input: " + input.distance + " in " + input.time + "s (" + input.timing + ", " + input.startType + " start)");
    if (result.adjustment && result.adjustment.applied && result.adjustment.enteredTime !== result.adjustment.normalizedTime) {
      lines.push("Entered time shown: " + result.adjustment.enteredTime.toFixed(2) + "s. Adjusted baseline used for other estimates: " + result.adjustment.normalizedTime.toFixed(2) + "s.");
    }
    lines.push("Confidence: " + result.confidence.level.toUpperCase() + " - " + result.confidence.explanation);
    if (result.maxSpeedApplied) lines.push("Top-speed constraint: applied from " + result.maxSpeedSource + ".");
    if (result.splitAnchorsUsed && result.splitAnchorsUsed.length) lines.push("Split anchors used: " + result.splitAnchorsUsed.join(", ") + ".");
    lines.push("");
    lines.push("Displayed times and estimated conversions:");
    Object.keys(tableEstimates).forEach(function (k) {
      lines.push("  " + resultKeyLabel(k, input, result).padEnd(18, " ") + " = " + tableEstimates[k] + "s");
    });
    lines.push("");
    lines.push("Speeds (avg over entered distance/time): " + result.speeds.avgMph + " mph / " + result.speeds.avgMs + " m/s / " + result.speeds.avgKmh + " km/h");
    if (result.speeds.topMph) lines.push("Estimated top speed: " + result.speeds.topMph + " mph / " + result.speeds.topMs + " m/s");
    lines.push("");
    lines.push("Acceleration: " + result.subScores.acceleration.tier + " (" + result.subScores.acceleration.score + ")");
    lines.push("Max velocity: " + result.subScores.maxVelocity.tier + " (" + result.subScores.maxVelocity.score + ")");
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
      obj[k] = k === "applyHandTimeAdjustment" ? !!v : (v === null ? "" : v);
    });
    obj.profile = {
      ageGroup: obj.ageGroup || null,
      sex: obj.sex || null,
      sport: obj.sport || null,
      position: obj.position || null
    };
    return obj;
  }

  function setFieldValue(form, name, value) {
    var fields = form.querySelectorAll("[name='" + name + "']");
    if (!fields.length) return;
    fields.forEach(function (input) {
      if (input.type === "radio") input.checked = input.value === String(value);
      else if (input.type === "checkbox") input.checked = value === true || value === "1" || value === "true";
      else input.value = value;
    });
  }

  function applyDefaults(form, defaults) {
    if (!form || !defaults) return;
    Object.keys(defaults).forEach(function (k) {
      if (SHARE_KEYS.indexOf(k) === -1) return;
      setFieldValue(form, k, defaults[k]);
    });
  }

  function makeEl(tag, attrs, text) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "class") el.className = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    if (text) el.textContent = text;
    return el;
  }

  function ensureTopSpeedControls(form) {
    if (form.querySelector("[name='topSpeed']")) return;
    var splitInput = form.querySelector("[name='split10y'], [name='flying10m']");
    if (!splitInput) return;
    var grid = splitInput.closest(".form-grid");
    if (!grid) return;

    var speedLabel = makeEl("label", { class: "field" });
    speedLabel.appendChild(makeEl("span", { class: "label-text" }, "Measured top speed"));
    var speedInput = makeEl("input", {
      name: "topSpeed",
      type: "number",
      inputmode: "decimal",
      step: "0.01",
      min: "0",
      placeholder: "e.g. 21.4"
    });
    speedLabel.appendChild(speedInput);
    speedLabel.appendChild(makeEl("span", { class: "help" }, "GPS, laser, radar, or timing-gate peak speed. This changes max-speed-heavy estimates."));

    var unitLabel = makeEl("label", { class: "field" });
    unitLabel.appendChild(makeEl("span", { class: "label-text" }, "Top-speed unit"));
    var unitSelect = makeEl("select", { name: "topSpeedUnit" });
    unitSelect.appendChild(makeEl("option", { value: "mph" }, "mph"));
    unitSelect.appendChild(makeEl("option", { value: "ms" }, "m/s"));
    unitLabel.appendChild(unitSelect);
    unitLabel.appendChild(makeEl("span", { class: "help" }, "Most wearables report mph in the U.S."));

    grid.insertBefore(unitLabel, grid.firstChild);
    grid.insertBefore(speedLabel, unitLabel);
  }

  function enhanceHandAdjustment(form) {
    var timing = form.querySelector("[name='timing']");
    var box = form.querySelector("[name='applyHandTimeAdjustment']");
    if (!timing || !box) return;
    var label = box.closest(".checkbox-row");
    var note = label ? label.querySelector("[data-sc-hand-note]") : null;
    if (!note && label) {
      note = makeEl("div", { class: "help", "data-sc-hand-note": "" });
      note.style.fontWeight = "400";
      note.style.marginTop = "4px";
      label.appendChild(note);
    }
    function sync() {
      var isHand = timing.value === "hand";
      box.disabled = isHand;
      if (isHand) box.checked = false;
      if (note) note.textContent = isHand
        ? "Already applied because Timing method is Hand timed."
        : "Use this only when the selected timing method is not hand timed but you still need the +0.24s adjustment.";
    }
    timing.addEventListener("change", sync);
    sync();
  }

  function bootstrapCalculator(options) {
    options = options || {};
    var form = document.getElementById(options.formId || "sc-form");
    var results = document.getElementById(options.resultsId || "sc-results");
    var errors = document.getElementById(options.errorsId || "sc-errors");
    if (!form || !results || !errors) return;

    ensureTopSpeedControls(form);
    enhanceHandAdjustment(form);

    var urlState = readShareUrl();
    var hasUrl = Object.keys(urlState).length > 0;
    applyDefaults(form, hasUrl ? urlState : (options.defaults || {}));
    enhanceHandAdjustment(form);

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
        enhanceHandAdjustment(form);
      }, 0);
    });

    results.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("[data-sc-action]");
      if (!t || !lastResult) return;
      var status = results.querySelector(".share-status");
      if (t.getAttribute("data-sc-action") === "copy") {
        copyResultsToClipboard(buildResultText(lastInput, lastResult))
          .then(function () { if (status) status.textContent = "Results copied to clipboard."; })
          .catch(function () { if (status) status.textContent = "Could not copy. Select the text above to copy manually."; });
      } else if (t.getAttribute("data-sc-action") === "share") {
        copyResultsToClipboard(buildShareUrl(readForm(form)))
          .then(function () { if (status) status.textContent = "Share link copied - paste it anywhere."; })
          .catch(function () { if (status) status.textContent = "Could not copy share link."; });
      }
    });

    function compute() {
      errors.innerHTML = "";
      var raw = readForm(form);
      var v = window.SC.validation.validate(raw);
      if (!v.valid) {
        var ul = document.createElement("ul");
        v.errors.forEach(function (msg) {
          var li = document.createElement("li");
          li.textContent = msg;
          ul.appendChild(li);
        });
        errors.appendChild(ul);
        try { errors.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (e) {}
        return;
      }
      try {
        var result = window.SC.calculator.estimate(v.normalized);
        lastInput = v.normalized;
        lastResult = result;
        results.innerHTML = "";
        results.appendChild(window.SC.benchmarks.renderResults(v.normalized, result));
        if (options.onResult) options.onResult(v.normalized, result);
        if (options.revealId) {
          var wrap = document.getElementById(options.revealId);
          if (wrap && wrap.hasAttribute("hidden")) wrap.removeAttribute("hidden");
        }
        if (options.scrollOnResult !== false) {
          var target = options.scrollTargetId ? document.getElementById(options.scrollTargetId) || results : results;
          var prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          requestAnimationFrame(function () {
            try { target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" }); }
            catch (e) { target.scrollIntoView(); }
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
