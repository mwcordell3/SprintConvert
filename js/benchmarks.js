/* Sprint Performance Calculator - Benchmark Display Helpers
 * -------------------------------------------------------
 * Renders the benchmark card and the "no benchmark for this profile"
 * fallback. Always cites the source. Never invents data.
 */
(function () {
  "use strict";

  var DISCLAIMERS = {
    notPercentile: "These are general performance ranges, not exact percentiles.",
    variability: "Performance varies based on timing method, surface, footwear, wind, start type, and testing conditions."
  };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === "class") node.className = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else node.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach(function (c) {
      if (typeof c === "string") node.appendChild(document.createTextNode(c));
      else if (c) node.appendChild(c);
    });
    return node;
  }

  function distanceLabel(input, result, d) {
    if (result && d.key === result.srcKey) return d.label + " (entered)";
    if (input && input.split10y && d.key === "10y") return d.label + " (entered split)";
    if (input && input.split20y && d.key === "20y") return d.label + " (entered split)";
    if (input && input.block30m && d.key === "30m") return d.label + " (entered 30m)";
    return d.label;
  }

  function adjustmentText(input, result) {
    if (!input || !result || !result.adjustment || !result.adjustment.applied) return null;
    if (result.adjustment.enteredTime === result.adjustment.normalizedTime) return null;
    var calc = window.SC.calculator;
    var label = calc && calc.DISTANCE_BY_KEY[result.srcKey] ? calc.DISTANCE_BY_KEY[result.srcKey].label : "input";
    return "Your entered " + label + " time stays " + result.adjustment.enteredTime.toFixed(2) + "s in the table. For the other estimates, the model used a " + result.adjustment.normalizedTime.toFixed(2) + "s adjusted baseline after timing/start adjustments.";
  }

  function renderBenchmarkCard(result) {
    var card = el("section", { class: "card benchmark-card", "aria-label": "Benchmark comparison" });
    card.appendChild(el("h3", { text: "Benchmark comparison" }));

    if (!result || !result.benchmark) {
      card.appendChild(el("p", { class: "muted",
        text: "We do not have a verified benchmark range for this exact profile yet. Your estimated sprint conversions are still shown, but no sport/age/category benchmark is provided."
      }));
      return card;
    }

    var b = result.benchmark.match;
    var tier = result.benchmark.tier;
    var compared = result.benchmark.comparedTime;
    var distLabel = b.distance;

    var tierClass = "tier-" + (tier || "unknown").toLowerCase().replace(/\s+/g, "-");
    var heading = el("p", { class: "benchmark-tier " + tierClass },
      [el("strong", { text: "General tier: " }), document.createTextNode(tier || "Unavailable")]);
    card.appendChild(heading);

    card.appendChild(el("p", {}, [
      document.createTextNode("Compared to general "),
      el("em", { text: b.sport + " " + distLabel + " (" + b.category + ")" }),
      document.createTextNode(" using your displayed " + distLabel + " time of "),
      el("strong", { text: compared + "s" }),
      document.createTextNode(".")
    ]));

    var ladder = el("ul", { class: "tier-ladder", "aria-label": "Tier thresholds (lower time is faster)" });
    [
      { label: "Developing", val: b.developing },
      { label: "Competitive", val: b.competitive },
      { label: "Advanced", val: b.advanced },
      { label: "Elite", val: b.elite }
    ].forEach(function (row) {
      var li = el("li", { class: row.label === tier ? "active" : "" }, [
        el("span", { class: "tier-name", text: row.label }),
        el("span", { class: "tier-val", text: "<= " + row.val.toFixed(2) + "s" })
      ]);
      ladder.appendChild(li);
    });
    card.appendChild(ladder);

    var confLabel = b.confidence === "verified" ? "Verified source benchmark" : (b.confidence === "general" ? "General benchmark range" : "");
    if (confLabel) card.appendChild(el("p", { class: "benchmark-confidence", text: confLabel }));

    if (b.notes) card.appendChild(el("p", { class: "muted small", text: b.notes }));
    card.appendChild(el("p", { class: "muted small", text: DISCLAIMERS.notPercentile }));
    card.appendChild(el("p", { class: "muted small", text: DISCLAIMERS.variability }));

    card.appendChild(el("p", { class: "benchmark-source small" }, [
      document.createTextNode("Source: "),
      el("a", { href: b.sourceUrl, rel: "noopener", target: "_blank" }, [b.sourceName])
    ]));

    return card;
  }

  function renderResults(input, result) {
    var frag = document.createDocumentFragment();

    if (result.warnings && result.warnings.length) {
      var w = el("div", { class: "warnings", role: "alert", "aria-live": "polite" });
      result.warnings.forEach(function (msg) { w.appendChild(el("p", { text: "Warning: " + msg })); });
      frag.appendChild(w);
    }

    var confCard = el("section", { class: "card confidence-card", "aria-label": "Confidence rating" });
    confCard.appendChild(el("h3", { text: "Confidence rating" }));
    var confLevel = (result.confidence.level || "low").toLowerCase();
    confCard.appendChild(el("p", { class: "conf-level conf-" + confLevel }, [el("strong", { text: confLevel.toUpperCase() })]));
    confCard.appendChild(el("p", { class: "muted", text: result.confidence.explanation }));
    frag.appendChild(confCard);

    var calc = window.SC.calculator;
    var tableEstimates = result.displayEstimates || result.estimates;
    var splitsCard = el("section", { class: "card splits-card", "aria-label": "Estimated sprint conversions" });
    splitsCard.appendChild(el("h3", { text: "Estimated sprint conversions" }));
    var adjText = adjustmentText(input, result);
    if (adjText) splitsCard.appendChild(el("p", { class: "muted small", text: adjText }));
    splitsCard.appendChild(el("p", { class: "muted small",
      text: "Entered rows stay as entered. Other rows are estimates, not official marks. Lower times are faster." }));

    var table = el("table", { class: "splits-table" });
    table.appendChild(el("thead", {}, [
      el("tr", {}, [el("th", { scope: "col", text: "Distance" }), el("th", { scope: "col", text: "Time" })])
    ]));
    var tbody = el("tbody");
    calc.DISTANCES.forEach(function (d) {
      var t = tableEstimates[d.key];
      tbody.appendChild(el("tr", {}, [
        el("td", { text: distanceLabel(input, result, d) }),
        el("td", { text: t !== null && t !== undefined ? t.toFixed(2) + "s" : "-" })
      ]));
    });
    table.appendChild(tbody);
    splitsCard.appendChild(table);
    frag.appendChild(splitsCard);

    var perfCard = el("section", { class: "card perf-card", "aria-label": "Speed and performance scores" });
    perfCard.appendChild(el("h3", { text: "Speed and performance" }));
    var grid = el("div", { class: "perf-grid" });

    function metricBlock(label, value, sub) {
      var b = el("div", { class: "metric" });
      b.appendChild(el("span", { class: "metric-label", text: label }));
      b.appendChild(el("span", { class: "metric-value", text: value }));
      if (sub) b.appendChild(el("span", { class: "metric-sub muted small", text: sub }));
      return b;
    }

    var topSpeedSub = result.maxSpeedApplied
      ? "Measured or derived from your top-speed/flying input; used to shape longer estimates."
      : "Estimated from the entered distance and time.";

    grid.appendChild(metricBlock("Average speed (mph)", String(result.speeds.avgMph), "Across your entered distance and time"));
    grid.appendChild(metricBlock("Average speed (m/s)", String(result.speeds.avgMs)));
    grid.appendChild(metricBlock("Average speed (km/h)", String(result.speeds.avgKmh)));
    grid.appendChild(metricBlock("Estimated top speed (mph)", String(result.speeds.topMph), topSpeedSub));
    grid.appendChild(metricBlock("Acceleration", result.subScores.acceleration.tier, "score " + result.subScores.acceleration.score));
    grid.appendChild(metricBlock("Max velocity", result.subScores.maxVelocity.tier, "score " + result.subScores.maxVelocity.score));
    grid.appendChild(metricBlock("Speed endurance", result.subScores.speedEndurance.tier, "score " + result.subScores.speedEndurance.score));
    perfCard.appendChild(grid);
    frag.appendChild(perfCard);

    frag.appendChild(renderBenchmarkCard(result));

    var actions = el("section", { class: "card actions-card" });
    actions.appendChild(el("h3", { text: "Save or share" }));
    var btnRow = el("div", { class: "btn-row" });

    var copyBtn = el("button", { type: "button", class: "btn btn-secondary", "data-sc-action": "copy" });
    copyBtn.appendChild(document.createTextNode("Copy results"));
    btnRow.appendChild(copyBtn);

    var shareBtn = el("button", { type: "button", class: "btn btn-secondary", "data-sc-action": "share" });
    shareBtn.appendChild(document.createTextNode("Copy share link"));
    btnRow.appendChild(shareBtn);

    actions.appendChild(btnRow);
    actions.appendChild(el("p", { class: "share-status muted small", "aria-live": "polite" }));
    frag.appendChild(actions);

    var dis = el("section", { class: "card disclaimer-card", "aria-label": "Disclaimer" });
    dis.appendChild(el("h3", { text: "Important disclaimer" }));
    dis.appendChild(el("p", { class: "small",
      text: "This site provides estimated sprint conversions and general performance ranges for educational and training-reference purposes only. Results are not official marks, not exact percentiles, and should not be used as the sole basis for recruiting, scholarship, roster, medical, or training decisions."
    }));
    dis.appendChild(el("p", { class: "small",
      text: "No guarantee is made that any estimate, benchmark, or comparison is accurate for a specific athlete. Consult qualified coaches, trainers, or medical professionals before making training decisions. Use this site at your own risk. No warranty is provided."
    }));
    frag.appendChild(dis);

    return frag;
  }

  if (typeof window !== "undefined") {
    window.SC = window.SC || {};
    window.SC.benchmarks = {
      renderBenchmarkCard: renderBenchmarkCard,
      renderResults: renderResults,
      DISCLAIMERS: DISCLAIMERS
    };
  }
})();
