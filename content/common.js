// Shared content-script utilities used by all SIS adapters.
// Attaches everything to `window.RMP` so adapter files can use it.

(function () {
  const RMP = (window.RMP = window.RMP || {});

  RMP.BADGE_ATTR = "data-rmp-badge";

  // ===== IPC + cache =====

  const profCache = new Map();
  const detailsCache = new Map();

  RMP.searchProfessor = function searchProfessor(lastName, firstInitial, subject, firstName) {
    // Cache by (name + initial + firstName + subject). PeopleSoft gives full
    // first names so "Kenneth" vs "Kimberly" both have lastName=Mitchell and
    // firstInitial=K — they must NOT share a cache slot.
    const key = `${lastName}_${firstInitial}_${(firstName || "").toLowerCase()}_${subject || ""}`.toLowerCase();
    if (profCache.has(key)) return profCache.get(key);

    const promise = chrome.runtime
      .sendMessage({ type: "rmp:search", lastName, firstInitial, subject, firstName })
      .then((resp) => {
        if (resp?.error) {
          console.error("[RMP] background error:", resp.error);
          return null;
        }
        return resp?.result ?? null;
      })
      .catch((err) => {
        console.error("[RMP] message failed:", err.message);
        return null;
      });

    profCache.set(key, promise);
    return promise;
  };

  RMP.fetchDetails = function fetchDetails(id) {
    if (detailsCache.has(id)) return detailsCache.get(id);
    const promise = chrome.runtime
      .sendMessage({ type: "rmp:teacherDetails", id })
      .then((resp) => (resp?.error ? null : resp?.result ?? null))
      .catch(() => null);
    detailsCache.set(id, promise);
    return promise;
  };

  // ===== Course-info extractor =====
  // Walks up from the badge container, testing each ancestor's textContent
  // against a course-code pattern. Returns as soon as a match is found. Tag-
  // agnostic — works for real <tr>, ARIA <div role="row">, or arbitrary card-
  // shaped containers.

  const ADJACENT_COURSE_RE = /\b([A-Z]{2,4})[\s\-]+(\d{3,4}[A-Z]{0,2})\b/g;
  const LABELED_SUBJECT_RE = /Subject(?:\s*and\s*Course\s*Number)?\s*:\s*([A-Z]{2,4})/i;
  const LABELED_NUMBER_RE = /Course\s*Number\s*:\s*(\d{3,4}[A-Z]?)/i;

  // Tokens shaped like a subject code (2-4 uppercase letters) but that aren't.
  // PeopleSoft renders day-of-week column headers ("SUN", "MON", etc.) right
  // before numeric class codes in flattened textContent, producing false
  // positives like "SUN 004". Banner doesn't have this problem because its
  // textContent layout is different.
  const SUBJECT_BLACKLIST = new Set([
    "SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT",
    "TBA", "TBD", "STAFF",
    "MTW", "MWF", "TR", "TWR", "AM", "PM",
    "CRN", "ID", "GPA",
  ]);

  function findFirstValidCourseMatch(text) {
    if (!text) return null;
    ADJACENT_COURSE_RE.lastIndex = 0;
    for (const m of text.matchAll(ADJACENT_COURSE_RE)) {
      const subject = m[1];
      if (SUBJECT_BLACKLIST.has(subject)) continue;
      return { subject, courseCode: `${subject}${m[2]}` };
    }
    return null;
  }

  RMP.findCourseInfo = function findCourseInfo(element) {
    let parent = element;
    // Depth 30 is a safety budget — Banner rows resolve in 2-4 levels; PeopleSoft
    // nests through ~14-18 wrapper tables before reaching the course header div.
    for (let depth = 0; parent && parent !== document.body && depth < 30; depth++) {
      const text = parent.textContent || "";

      const adj = findFirstValidCourseMatch(text);
      if (adj) return adj;

      const subM = text.match(LABELED_SUBJECT_RE);
      const numM = text.match(LABELED_NUMBER_RE);
      if (subM && numM && !SUBJECT_BLACKLIST.has(subM[1].toUpperCase())) {
        const s = subM[1].toUpperCase();
        return { subject: s, courseCode: `${s}${numM[1]}` };
      }

      parent = parent.parentElement;
    }
    return null;
  };

  // ===== Hover popover (rating distribution) =====

  let popoverEl = null;
  let popoverHideTimer = null;
  let popoverRequestId = 0;

  function ensurePopover() {
    if (popoverEl) return popoverEl;
    popoverEl = document.createElement("div");
    popoverEl.className = "rmp-popover";
    popoverEl.addEventListener("mouseenter", () => clearTimeout(popoverHideTimer));
    popoverEl.addEventListener("mouseleave", scheduleHidePopover);
    document.body.appendChild(popoverEl);
    return popoverEl;
  }

  function scheduleHidePopover() {
    clearTimeout(popoverHideTimer);
    popoverHideTimer = setTimeout(() => {
      if (popoverEl) popoverEl.classList.remove("rmp-popover--show");
    }, 180);
  }

  const DIST_LABELS = [
    { key: "r5", label: "Awesome", num: 5, tier: "good" },
    { key: "r4", label: "Great", num: 4, tier: "good" },
    { key: "r3", label: "Good", num: 3, tier: "ok" },
    { key: "r2", label: "OK", num: 2, tier: "bad" },
    { key: "r1", label: "Awful", num: 1, tier: "bad" },
  ];

  function buildPopoverContent(prof, details) {
    const frag = document.createDocumentFragment();

    if (prof.ambiguous) {
      const warn = document.createElement("div");
      warn.className = "rmp-pop__warn";
      warn.textContent = "⚠ Multiple professors share this name — verify before deciding";
      frag.appendChild(warn);
    }

    const header = document.createElement("div");
    header.className = "rmp-pop__header";

    const name = document.createElement("div");
    name.className = "rmp-pop__name";
    name.textContent = prof.name;
    header.appendChild(name);

    const subline = document.createElement("div");
    subline.className = "rmp-pop__subline";
    const parts = [];
    if (prof.department) parts.push(prof.department);
    if (prof.numRatings) parts.push(`${prof.numRatings} rating${prof.numRatings === 1 ? "" : "s"}`);
    subline.textContent = parts.join(" · ");
    if (parts.length) header.appendChild(subline);

    const headline = document.createElement("div");
    headline.className = "rmp-pop__headline";
    if (prof.rating != null) {
      const big = document.createElement("span");
      big.className = "rmp-pop__big-rating";
      big.textContent = Number(prof.rating).toFixed(1);
      headline.appendChild(big);
      const slash = document.createElement("span");
      slash.className = "rmp-pop__slash";
      slash.textContent = "/ 5";
      headline.appendChild(slash);
    }
    if (prof.wouldTakeAgainPct > 0) {
      const wta = document.createElement("span");
      wta.className = "rmp-pop__wta";
      wta.textContent = `${prof.wouldTakeAgainPct}% would take again`;
      headline.appendChild(wta);
    }
    header.appendChild(headline);
    frag.appendChild(header);

    if (!details) {
      const loading = document.createElement("div");
      loading.className = "rmp-pop__loading";
      loading.textContent = "Loading…";
      frag.appendChild(loading);
    } else {
      const dist = details.distribution;
      if (dist && dist.total > 0) {
        const max = Math.max(dist.r1, dist.r2, dist.r3, dist.r4, dist.r5, 1);
        const chart = document.createElement("div");
        chart.className = "rmp-pop__dist";
        for (const row of DIST_LABELS) {
          const count = dist[row.key] || 0;
          const r = document.createElement("div");
          r.className = "rmp-pop__dist-row";

          const lbl = document.createElement("span");
          lbl.className = "rmp-pop__dist-label";
          lbl.appendChild(document.createTextNode(`${row.label} `));
          const numEl = document.createElement("span");
          numEl.className = "rmp-pop__dist-num";
          numEl.textContent = row.num;
          lbl.appendChild(numEl);
          r.appendChild(lbl);

          const track = document.createElement("div");
          track.className = "rmp-pop__dist-track";
          const fill = document.createElement("div");
          fill.className = `rmp-pop__dist-fill rmp-pop__dist-fill--${row.tier}`;
          fill.style.width = `${(count / max) * 100}%`;
          track.appendChild(fill);
          r.appendChild(track);

          const cnt = document.createElement("span");
          cnt.className = "rmp-pop__dist-count";
          cnt.textContent = count;
          r.appendChild(cnt);

          chart.appendChild(r);
        }
        frag.appendChild(chart);
      } else {
        const empty = document.createElement("div");
        empty.className = "rmp-pop__loading";
        empty.textContent = "No rating distribution available.";
        frag.appendChild(empty);
      }
    }

    const footer = document.createElement("a");
    footer.className = "rmp-pop__footer";
    footer.href = prof.rmpUrl;
    footer.target = "_blank";
    footer.rel = "noopener noreferrer";
    footer.textContent = "Read reviews on Rate My Professors →";
    frag.appendChild(footer);

    return frag;
  }

  function positionPopover(card) {
    const pop = ensurePopover();
    const rect = card.getBoundingClientRect();
    const margin = 8;
    const popWidth = 320;

    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + margin;

    if (left + popWidth > window.innerWidth + window.scrollX - 12) {
      left = window.innerWidth + window.scrollX - popWidth - 12;
    }
    if (left < 8) left = 8;

    const popHeight = pop.offsetHeight || 240;
    if (rect.bottom + popHeight + margin > window.innerHeight && rect.top > popHeight + margin) {
      top = rect.top + window.scrollY - popHeight - margin;
    }

    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }

  async function showPopover(card, prof) {
    const myReq = ++popoverRequestId;
    clearTimeout(popoverHideTimer);
    const pop = ensurePopover();
    pop.innerHTML = "";
    pop.appendChild(buildPopoverContent(prof, null));
    pop.classList.add("rmp-popover--show");
    positionPopover(card);

    const details = await RMP.fetchDetails(prof.id);
    if (myReq !== popoverRequestId) return;
    pop.innerHTML = "";
    pop.appendChild(buildPopoverContent(prof, details));
    positionPopover(card);
  }

  function attachHoverHandlers(card, prof) {
    card.addEventListener("mouseenter", () => {
      showPopover(card, prof);
    });
    card.addEventListener("mouseleave", scheduleHidePopover);
  }

  // ===== Badge injection =====

  function ratingTier(rating) {
    if (rating == null) return "none";
    if (rating >= 4.0) return "good";
    if (rating >= 3.0) return "ok";
    return "bad";
  }

  function makeCol(label, value) {
    const col = document.createElement("div");
    col.className = "rmp-col";
    const valueEl = document.createElement("span");
    valueEl.className = "rmp-col__value";
    valueEl.textContent = value;
    const labelEl = document.createElement("span");
    labelEl.className = "rmp-col__label";
    labelEl.textContent = label;
    col.appendChild(valueEl);
    col.appendChild(labelEl);
    return col;
  }

  RMP.injectBadge = function injectBadge(element, data) {
    const wrap = document.createElement("div");
    wrap.className = "rmp-container";

    if (!data) {
      const empty = document.createElement("span");
      empty.className = "rmp-empty";
      empty.textContent = "No RMP data";
      wrap.appendChild(empty);
      element.appendChild(wrap);
      return;
    }

    const tier = ratingTier(data.rating);
    const nameWithDept = data.department ? `${data.name} (${data.department})` : data.name;
    // RMP can return null avgRating / avgDifficulty for profs with very few or
    // zero ratings — must not call .toFixed on null. Render "—" instead.
    const ratingStr = typeof data.rating === "number" ? data.rating.toFixed(1) : "—";
    const diffStr = typeof data.difficulty === "number" ? data.difficulty.toFixed(1) : "—";
    const tooltip =
      (data.ambiguous ? "⚠ Multiple professors share this name — verify before deciding\n" : "") +
      `${nameWithDept} — ${data.numRatings} ratings on Rate My Professors\n` +
      `Rating: ${ratingStr}/5  ·  Difficulty: ${diffStr}/5` +
      (data.wouldTakeAgainPct > 0 ? `  ·  Would take again: ${data.wouldTakeAgainPct}%` : "");

    const card = document.createElement("a");
    card.href = data.rmpUrl;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.className = `rmp-card rmp-card--${tier}`;
    card.title = tooltip;

    const row = document.createElement("div");
    row.className = "rmp-row";
    row.appendChild(makeCol("Rating", ratingStr));
    row.appendChild(makeCol("Diff", diffStr));
    if (data.wouldTakeAgainPct > 0) {
      row.appendChild(makeCol("Retake", `${data.wouldTakeAgainPct}%`));
    }

    const bar = document.createElement("div");
    bar.className = "rmp-bar";
    const fill = document.createElement("div");
    fill.className = "rmp-bar__fill";
    // If rating is null, bar reads as 0% rather than weird negative pixel widths.
    const ratingForBar = typeof data.rating === "number" ? data.rating : 1;
    const ratingPct = Math.max(0, Math.min(100, ((ratingForBar - 1) / 4) * 100));
    fill.style.width = `${ratingPct}%`;
    bar.appendChild(fill);

    card.appendChild(row);
    card.appendChild(bar);
    wrap.appendChild(card);
    element.appendChild(wrap);

    if (data.id) attachHoverHandlers(card, data);
  };

  // ===== Generic processing pipeline used by adapters =====
  // Adapters pass each (element, parsed) match into this; common.js handles
  // the search → inject pipeline and dedup. Keeps adapters minimal.

  RMP.processInstructorElement = function processInstructorElement(element, parsed) {
    if (!element || !parsed) return;
    if (element.hasAttribute(RMP.BADGE_ATTR)) return;

    const courseInfo = RMP.findCourseInfo(element);
    element.setAttribute(RMP.BADGE_ATTR, "pending");

    RMP.searchProfessor(
      parsed.lastName,
      parsed.firstInitial,
      courseInfo?.subject,
      parsed.firstName
    ).then((result) => {
      RMP.injectBadge(element, result);
      element.setAttribute(RMP.BADGE_ATTR, "done");
    });
  };

  // ===== Adapter registry =====
  // Adapters call RMP.registerAdapter({ name, matches, init }). The dispatcher
  // (index.js) picks the first whose matches(location) returns true and calls
  // its init().

  RMP.adapters = [];
  RMP.registerAdapter = function registerAdapter(adapter) {
    RMP.adapters.push(adapter);
  };
})();
