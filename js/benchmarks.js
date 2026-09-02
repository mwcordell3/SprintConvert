/* SprintConvert - Benchmark and result display helpers */
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

  function shortDistanceLabel(key) {
    var calc = window.SC.calculator;
    return calc && calc.DISTANCE_BY_KEY[key] ? calc.DISTANCE_BY_KEY[key].label : key;
  }

  function formatTime(value) {
    return value !== null && value !== undefined && isFinite(value) ? Number(value).toFixed(2) + "s" : "-";
  }

  function adjustmentText(input, result) {
    if (!input || !result || !result.adjustment || !result.adjustment.applied) return null;
    if (result.adjustment.enteredTime === result.adjustment.normalizedTime) return null;
    var label = shortDistanceLabel(result.srcKey);
    return "Your entered " + label + " time stays " + result.adjustment.enteredTime.toFixed(2) + "s in the table. For the other estimates, the model used a " + result.adjustment.normalizedTime.toFixed(2) + "s adjusted baseline after timing/start adjustments.";
  }

  function snapshotItem(label, value, kind, className) {
    var item = el("div", { class: "snapshot-item " + (className || "") });
    item.appendChild(el("span", { class: "snapshot-label", text: label }));
    item.appendChild(el("span", { class: "snapshot-value", text: value }));
    item.appendChild(el("span", { class: "snapshot-kind", text: kind }));
    return item;
  }

  function renderSnapshotCard(input, result, tableEstimates) {
    var card = el("section", { class: "result-hero-card", "aria-label": "Sprint result summary" });
    card.appendChild(el("h3", { text: "Sprint snapshot" }));
    card.appendChild(el("p", { text: "The entered mark stays visible, while the estimates show how the same performance projects across common sprint tests." }));

    var grid = el("div", { class: "snapshot-grid" });
    grid.appendChild(snapshotItem(shortDistanceLabel(result.srcKey), formatTime(tableEstimates[result.srcKey]), "Entered", "entered"));

    var primaryKey = result.srcKey === "100m" ? "40y" : "100m";
    if (primaryKey !== result.srcKey) {
      grid.appendChild(snapshotItem(shortDistanceLabel(primaryKey), formatTime(tableEstimates[primaryKey]), "Estimate"));
    }

    var secondaryKey = result.srcKey === "200m" ? "40y" : "200m";
    if (secondaryKey !== result.srcKey && secondaryKey !== primaryKey) {
      grid.appendChild(snapshotItem(shortDistanceLabel(secondaryKey), formatTime(tableEstimates[secondaryKey]), "Estimate"));
    }

    grid.appendChild(snapshotItem("Top speed", result.speeds && result.speeds.topMph ? result.speeds.topMph + " mph" : "-", result.maxSpeedApplied ? "Measured input" : "Estimated"));
    grid.appendChild(snapshotItem("Confidence", result.confidence && result.confidence.level ? result.confidence.level.toUpperCase() : "-", "Reliability"));

    card.appendChild(grid);
    return card;
  }

  function renderDriverRow(title, body) {
    return el("li", {}, [el("strong", { text: title }), el("span", { text: body })]);
  }

  function renderDriversCard(input, result) {
    var card = el("section", { class: "card insight-card", "aria-label": "What shaped the estimate" });
    card.appendChild(el("h3", { text: "Why this estimate moved" }));
    card.appendChild(el("p", { class: "muted", text: "These are the inputs the model weighted most for this result." }));

    var list = el("ul", { class: "driver-list" });
    var adjText = adjustmentText(input, result);
    list.appendChild(renderDriverRow("Timing and start", adjText || "No timing or start adjustment changed the displayed entered time."));

    if (result.maxSpeedApplied) {
      list.appendChild(renderDriverRow("Top speed", "Your measured or flying-segment speed shaped the longer-distance estimates."));
    } else {
      list.appendChild(renderDriverRow("Top speed", "Top speed was estimated from the entered distance and time. Adding a measured max speed can tighten the projection."));
    }

    if (result.splitAnchorsUsed && result.splitAnchorsUsed.length) {
      list.appendChild(renderDriverRow("Splits", "Used entered split anchors: " + result.splitAnchorsUsed.join(", ") + "."));
    } else {
      list.appendChild(renderDriverRow("Splits", "No split anchors were entered, so acceleration shape was inferred from the main mark."));
    }

    list.appendChild(renderDriverRow("Confidence", result.confidence && result.confidence.explanation ? result.confidence.explanation : "Confidence reflects timing quality, start type, and how far the conversion stretches."));
    card.appendChild(list);
    return card;
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
    var calc = window.SC.calculator;
    var tableEstimates = result.displayEstimates || result.estimates;

    if (result.warnings && result.warnings.length) {
      var w = el("div", { class: "warnings", role: "alert", "aria-live": "polite" });
      result.warnings.forEach(function (msg) { w.appendChild(el("p", { text: "Warning: " + msg })); });
      frag.appendChild(w);
    }

    frag.appendChild(renderSnapshotCard(input, result, tableEstimates));

    var confCard = el("section", { class: "card confidence-card", "aria-label": "Confidence rating" });
    confCard.appendChild(el("h3", { text: "Confidence rating" }));
    var confLevel = (result.confidence.level || "low").toLowerCase();
    confCard.appendChild(el("p", { class: "conf-level conf-" + confLevel }, [el("strong", { text: confLevel.toUpperCase() })]));
    confCard.appendChild(el("p", { class: "muted", text: result.confidence.explanation }));
    frag.appendChild(confCard);

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

    grid.appendChild(metricBlock("Average speed", String(result.speeds.avgMph) + " mph", "Across your entered distance and time"));
    grid.appendChild(metricBlock("Meters / second", String(result.speeds.avgMs) + " m/s"));
    grid.appendChild(metricBlock("Kilometers / hour", String(result.speeds.avgKmh) + " km/h"));
    grid.appendChild(metricBlock("Top speed", String(result.speeds.topMph) + " mph", topSpeedSub));
    grid.appendChild(metricBlock("Acceleration", result.subScores.acceleration.tier, "score " + result.subScores.acceleration.score));
    grid.appendChild(metricBlock("Max velocity", result.subScores.maxVelocity.tier, "score " + result.subScores.maxVelocity.score));
    grid.appendChild(metricBlock("Speed endurance", result.subScores.speedEndurance.tier, "score " + result.subScores.speedEndurance.score));
    perfCard.appendChild(grid);
    frag.appendChild(perfCard);

    frag.appendChild(renderDriversCard(input, result));
    frag.appendChild(renderBenchmarkCard(result));

    var actions = el("section", { class: "card actions-card" });
    actions.appendChild(el("h3", { text: "Save or share" }));
    actions.appendChild(el("p", { class: "muted", text: "Copy the full report or save a link that reloads the same inputs." }));
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
