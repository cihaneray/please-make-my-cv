(() => {
  "use strict";

  const MAX_JSONLD_BLOCK_BYTES = 1048576; // 1 MiB
  const MAX_JSONLD_TRAVERSED_NODES = 2000;
  const MAX_DOM_NODE_VISITS = 20000;
  const MAX_DESCRIPTION_LENGTH = 20000;

  const BLOCKED_TAGS = new Set([
    "INPUT",
    "TEXTAREA",
    "SELECT",
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEMPLATE",
    "SVG",
    "CANVAS",
    "IFRAME",
    "OBJECT",
    "EMBED",
    "AUDIO",
    "VIDEO",
  ]);

  function isBlockedElement(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    if (BLOCKED_TAGS.has(el.tagName)) return true;
    if (el.isContentEditable || el.getAttribute("contenteditable") === "true")
      return true;
    if (el.getAttribute("type") === "password") return true;
    return false;
  }

  function isNodeVisible(node) {
    let el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    while (el && el !== document.documentElement) {
      if (isBlockedElement(el)) return false;
      if (
        el.hasAttribute("hidden") ||
        el.getAttribute("aria-hidden") === "true"
      )
        return false;
      try {
        const style = window.getComputedStyle(el);
        if (!style) return false;
        if (style.display === "none") return false;
        if (style.visibility === "hidden" || style.visibility === "collapse")
          return false;
      } catch (e) {
        return false;
      }
      el = el.parentElement;
    }
    return true;
  }

  function domNodeToCleanText(rootNode, range = null) {
    let visits = 0;
    let length = 0;
    const skipped = new Set([
      ...BLOCKED_TAGS,
      "IMG",
      "LINK",
      "SOURCE",
      "TRACK",
      "BUTTON",
    ]);
    function walk(node, depth) {
      if (
        ++visits > MAX_DOM_NODE_VISITS ||
        depth > 80 ||
        length >= MAX_DESCRIPTION_LENGTH
      )
        return "";
      if (range && !range.intersectsNode(node)) return "";
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.isConnected && !isNodeVisible(node)) return "";
        let text = node.nodeValue || "";
        if (range) {
          const from = node === range.startContainer ? range.startOffset : 0;
          const to =
            node === range.endContainer ? range.endOffset : text.length;
          text = text.slice(from, to);
        }
        text = text.slice(0, MAX_DESCRIPTION_LENGTH - length);
        length += text.length;
        return text;
      }
      if (
        node.nodeType !== Node.ELEMENT_NODE &&
        node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE
      )
        return "";
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (
          skipped.has(node.tagName) ||
          isBlockedElement(node) ||
          node.hasAttribute("contenteditable") ||
          node.hasAttribute("hidden") ||
          node.getAttribute("aria-hidden") === "true" ||
          node.style.display === "none" ||
          ["hidden", "collapse"].includes(node.style.visibility) ||
          (node.isConnected && !isNodeVisible(node))
        )
          return "";
        if (node.tagName === "BR") return "\n";
      }
      let text = "";
      for (const child of node.childNodes) {
        if (visits >= MAX_DOM_NODE_VISITS || length >= MAX_DESCRIPTION_LENGTH)
          break;
        text += walk(child, depth + 1);
      }
      const tag = node.tagName;
      if (tag === "LI") return text.trim() ? "\n• " + text.trim() + "\n" : "";
      if (
        [
          "P",
          "DIV",
          "SECTION",
          "ARTICLE",
          "BLOCKQUOTE",
          "TR",
          "UL",
          "OL",
        ].includes(tag) ||
        /^H[1-6]$/.test(tag || "")
      )
        return "\n" + text.trim() + "\n";
      return text;
    }
    try {
      return walk(rootNode, 0)
        .split("\n")
        .map((line) => line.replace(/[ \t]+/g, " ").trim())
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, MAX_DESCRIPTION_LENGTH);
    } catch {
      return "";
    }
  }

  function htmlToPlainText(htmlString) {
    if (typeof htmlString !== "string") return "";
    // The fragment stays inert: remote assets are never adopted into the live document.
    const template = document.createElement("template");
    template.innerHTML = htmlString.slice(0, MAX_JSONLD_BLOCK_BYTES);
    return domNodeToCleanText(template.content);
  }

  function collectJobPostings(rootObj, tracker) {
    const candidates = [];

    function walk(val, depth) {
      if (tracker.count >= MAX_JSONLD_TRAVERSED_NODES || depth > 20) {
        return;
      }
      if (!val || typeof val !== "object") {
        return;
      }

      tracker.count++;

      if (Array.isArray(val)) {
        for (const item of val) {
          walk(item, depth + 1);
          if (tracker.count >= MAX_JSONLD_TRAVERSED_NODES) break;
        }
        return;
      }

      const type = val["@type"];
      const isJobPosting =
        type === "JobPosting" ||
        (Array.isArray(type) && type.includes("JobPosting")) ||
        (typeof type === "string" && type.endsWith("/JobPosting"));

      if (isJobPosting) {
        candidates.push(val);
      }

      if (val["@graph"]) {
        walk(val["@graph"], depth + 1);
      }

      for (const key of Object.keys(val)) {
        if (
          key !== "@context" &&
          key !== "@graph" &&
          typeof val[key] === "object" &&
          val[key] !== null
        ) {
          walk(val[key], depth + 1);
          if (tracker.count >= MAX_JSONLD_TRAVERSED_NODES) break;
        }
      }
    }

    walk(rootObj, 0);
    return candidates;
  }

  function extractCompanyFromJsonLd(job) {
    const org = job.hiringOrganization || job.hiring_organization;
    if (!org) return "";
    if (typeof org === "string") return org.trim();
    if (typeof org === "object") {
      if (typeof org.name === "string") return org.name.trim();
      if (typeof org.legalName === "string") return org.legalName.trim();
    }
    return "";
  }

  function extractPositionFromJsonLd(job) {
    if (typeof job.title === "string") return job.title.trim();
    if (typeof job.jobTitle === "string") return job.jobTitle.trim();
    return "";
  }

  function extractDescriptionFromJsonLd(job) {
    const desc = job.description || job.responsibilities;
    if (!desc) return "";
    if (typeof desc === "string") {
      if (desc.includes("<") && desc.includes(">")) {
        return htmlToPlainText(desc);
      }
      return desc.trim();
    }
    return "";
  }

  function getSafeSelectedText() {
    try {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount !== 1)
        return "";
      const range = selection.getRangeAt(0);
      let ancestor = range.commonAncestorContainer;
      while (ancestor) {
        if (isBlockedElement(ancestor)) return "";
        ancestor = ancestor.parentElement;
      }
      return domNodeToCleanText(range.commonAncestorContainer, range);
    } catch {
      return "";
    }
  }

  function getVisibleLiveDomText() {
    if (!document.body) return "";

    let visitedNodes = 0;
    const chunks = [];
    let accumulatedLength = 0;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (isBlockedElement(node)) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_SKIP;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );

    let currentNode = walker.nextNode();
    while (
      currentNode &&
      visitedNodes < MAX_DOM_NODE_VISITS &&
      accumulatedLength < MAX_DESCRIPTION_LENGTH
    ) {
      visitedNodes++;

      if (currentNode.nodeType === Node.TEXT_NODE) {
        const textVal = currentNode.nodeValue;
        if (textVal && textVal.trim().length > 0) {
          if (isNodeVisible(currentNode)) {
            const cleaned = textVal.replace(/[ \t]+/g, " ");
            chunks.push(cleaned);
            accumulatedLength += cleaned.length;
          }
        }
      }

      currentNode = walker.nextNode();
    }

    return chunks
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_DESCRIPTION_LENGTH);
  }

  function isLinkedInHost(hostname) {
    if (!hostname || typeof hostname !== "string") return false;
    const h = hostname.toLowerCase();
    return h === "linkedin.com" || h.endsWith(".linkedin.com");
  }

  function extractLinkedInJobId(urlObj) {
    if (!isLinkedInHost(urlObj.hostname)) return null;
    const currentJobId = urlObj.searchParams.get("currentJobId");
    if (currentJobId && /^\d+$/.test(currentJobId.trim())) {
      return currentJobId.trim();
    }
    const viewMatch = urlObj.pathname.match(/\/jobs\/view\/(?:.*-)?(\d+)\/?$/);
    if (viewMatch && viewMatch[1]) {
      return viewMatch[1];
    }
    return null;
  }

  function getCanonicalSourceUrl(rawHref) {
    try {
      const parsed = new URL(rawHref);
      parsed.username = "";
      parsed.password = "";

      if (isLinkedInHost(parsed.hostname)) {
        const jobId = extractLinkedInJobId(parsed);
        if (jobId) {
          return `https://www.linkedin.com/jobs/view/${jobId}/`;
        }
        parsed.search = "";
        parsed.hash = "";
        return parsed.href.slice(0, 2048);
      }

      parsed.search = "";
      parsed.hash = "";
      return parsed.href.slice(0, 2048);
    } catch (e) {
      return "";
    }
  }

  function isInsideExcludedContainer(el) {
    let curr = el;
    while (
      curr &&
      curr !== document.body &&
      curr !== document.documentElement
    ) {
      if (curr.nodeType === Node.ELEMENT_NODE) {
        const cls =
          curr.className && typeof curr.className === "string"
            ? curr.className
            : "";
        const id = curr.id || "";
        if (
          cls.includes("job-card-container") ||
          cls.includes("jobs-search-results") ||
          cls.includes("jobs-search-results-list") ||
          cls.includes("scaffold-layout__list") ||
          cls.includes("similar-jobs") ||
          cls.includes("recommendation") ||
          cls.includes("job-card-list") ||
          cls.includes("compact-job-card") ||
          cls.includes("nav-") ||
          cls.includes("global-nav") ||
          id === "global-nav" ||
          id === "job-search-results-list"
        ) {
          return true;
        }
      }
      curr = curr.parentElement;
    }
    return false;
  }

  function findMatchingLinkedInJobLd(candidates, targetJobId) {
    if (!targetJobId) return null;
    const matches = candidates.filter((candidate) => {
      const identifier = candidate.identifier;
      const value =
        identifier && typeof identifier === "object"
          ? identifier.value
          : identifier;
      if (String(value || "") === targetJobId) return true;
      return [candidate.url, candidate["@id"], candidate.sameAs].some(
        (value) => {
          if (typeof value !== "string") return false;
          if (value === `urn:li:jobPosting:${targetJobId}`) return true;
          try {
            return extractLinkedInJobId(new URL(value)) === targetJobId;
          } catch {
            return false;
          }
        },
      );
    });
    return matches.length === 1 ? matches[0] : null;
  }

  const currentUrl = new URL(window.location.href);
  const isLinkedIn = isLinkedInHost(currentUrl.hostname);
  const canonicalUrl = getCanonicalSourceUrl(window.location.href);

  // Collect JobPosting candidates across all JSON-LD blocks
  const allJobCandidates = [];
  const jsonLdTracker = { count: 0 };
  const scripts = document.querySelectorAll(
    'script[type="application/ld+json"]',
  );

  for (let i = 0; i < Math.min(scripts.length, 30); i++) {
    if (jsonLdTracker.count >= MAX_JSONLD_TRAVERSED_NODES) break;
    const script = scripts[i];
    const rawText = script.textContent || "";
    if (!rawText.trim() || rawText.length > MAX_JSONLD_BLOCK_BYTES) {
      continue;
    }

    try {
      const parsed = JSON.parse(rawText);
      const found = collectJobPostings(parsed, jsonLdTracker);
      for (const item of found) {
        allJobCandidates.push(item);
      }
    } catch (e) {
      // Invalid JSON, continue
    }
  }

  let company = "";
  let location = "";
  let position = "";
  let description = "";
  let sourceType = "none";
  let warning = null;

  if (isLinkedIn) {
    // LinkedIn specific adapters
    const titleSelectors = [
      ".job-details-jobs-unified-top-card__job-title h1",
      ".job-details-jobs-unified-top-card__job-title",
      ".jobs-unified-top-card__job-title h1",
      ".jobs-unified-top-card__job-title",
      ".top-card-layout__title",
      ".topcard__title",
    ];

    const companySelectors = [
      ".job-details-jobs-unified-top-card__company-name",
      ".jobs-unified-top-card__company-name",
      ".topcard__org-name-link",
      ".top-card-layout__first-subline .topcard__flavor",
      ".top-card-layout__first-subline a",
    ];

    const descSelectors = [
      "#job-details",
      ".jobs-description-content__text",
      ".jobs-description__content",
      ".description__text .show-more-less-html__markup",
      ".description__text",
    ];

    // Prefer the panel whose explicit job ID matches the URL. During LinkedIn
    // SPA navigation both the previous and current details can be mounted.
    const activeJobId = extractLinkedInJobId(currentUrl);
    let scope = document;
    const identifiedPanels = Array.from(
      document.querySelectorAll("[data-job-id], [data-occludable-job-id]"),
    ).filter(
      (el) =>
        isNodeVisible(el) &&
        !isInsideExcludedContainer(el) &&
        (el.querySelector(titleSelectors.join(",")) ||
          el.querySelector(descSelectors.join(","))),
    );
    if (activeJobId && identifiedPanels.length) {
      const matches = identifiedPanels.filter(
        (el) =>
          (el.getAttribute("data-job-id") ||
            el.getAttribute("data-occludable-job-id")) === activeJobId,
      );
      if (matches.length === 1) scope = matches[0];
      else warning = "conflicting_panels";
    }

    const foundTitles = new Set();
    const legacyLocations = new Set(
      Array.from(
        scope.querySelectorAll(
          ".topcard__flavor--bullet, .jobs-unified-top-card__bullet, .job-details-jobs-unified-top-card__primary-description-container .tvm__text--low-emphasis",
        ),
      )
        .filter((el) => isNodeVisible(el) && !isInsideExcludedContainer(el))
        .map((el) => domNodeToCleanText(el).split("·")[0].trim())
        .filter(Boolean),
    );
    if (legacyLocations.size === 1) location = Array.from(legacyLocations)[0];
    scope.querySelectorAll(titleSelectors.join(",")).forEach((el) => {
      if (isNodeVisible(el) && !isInsideExcludedContainer(el)) {
        const text = (el.textContent || "").replace(/\s+/g, " ").trim();
        if (text) foundTitles.add(text);
      }
    });

    const foundCompanies = new Set();
    scope.querySelectorAll(companySelectors.join(",")).forEach((el) => {
      if (isNodeVisible(el) && !isInsideExcludedContainer(el)) {
        const text = (el.textContent || "").replace(/\s+/g, " ").trim();
        if (text) foundCompanies.add(text);
      }
    });

    const foundDescElements = [];
    scope.querySelectorAll(descSelectors.join(",")).forEach((el) => {
      if (isNodeVisible(el) && !isInsideExcludedContainer(el)) {
        if (
          !foundDescElements.some(
            (other) => other.contains(el) || el.contains(other),
          )
        ) {
          foundDescElements.push(el);
        }
      }
    });

    // Check for conflicting visible panels
    const descriptions = new Set(
      foundDescElements.map((el) => domNodeToCleanText(el)).filter(Boolean),
    );
    if (
      warning ||
      foundTitles.size > 1 ||
      foundCompanies.size > 1 ||
      descriptions.size > 1
    ) {
      warning = "conflicting_panels";
      location = "";
      company = "";
      position = "";
      description = "";
      sourceType = "none";
    } else {
      if (foundTitles.size === 1) {
        position = Array.from(foundTitles)[0];
      }
      if (foundCompanies.size === 1) {
        company = Array.from(foundCompanies)[0];
      }
      if (descriptions.size === 1) description = Array.from(descriptions)[0];

      // LinkedIn's semantic/component UI uses generated CSS classes, paragraph
      // titles and expandable text boxes instead of the legacy top-card DOM.
      // Match the employer by the current job binding; never take recommendations.
      const semanticCompanies = Array.from(
        scope.querySelectorAll("[aria-label][componentkey]"),
      ).filter((el) => {
        const label = el.getAttribute("aria-label") || "";
        const binding = el.getAttribute("componentkey") || "";
        return (
          /^(Company|Şirket),/i.test(label) &&
          (!activeJobId || binding.endsWith(`-${activeJobId}`)) &&
          isNodeVisible(el) &&
          !isInsideExcludedContainer(el)
        );
      });
      const semanticNames = new Set(
        semanticCompanies
          .map((el) => {
            return (
              Array.from(el.querySelectorAll('a[href*="/company/"]'))
                .filter((anchor) => isNodeVisible(anchor))
                .map((anchor) =>
                  domNodeToCleanText(anchor).replace(/\s+/g, " ").trim(),
                )
                .find(Boolean) || ""
            );
          })
          .filter(Boolean),
      );
      if (
        semanticNames.size === 1 &&
        (!company || semanticNames.has(company))
      ) {
        if (!company) company = Array.from(semanticNames)[0];
        // The document title is only a search hint. A matching visible text node
        // in the employer's header is mandatory; metadata alone is never captured.
        const titleHint = document.title.split("|")[0].trim();
        if (!position && titleHint) {
          const matchedTitles = new Set();
          semanticCompanies.forEach((el) => {
            let header = el.parentElement;
            for (
              let depth = 0;
              header && depth < 6;
              depth++, header = header.parentElement
            ) {
              if (
                header === document.body ||
                header === document.documentElement
              )
                break;
              const titles = Array.from(
                header.querySelectorAll('p, h1, [role="heading"]'),
              ).filter(
                (node) =>
                  isNodeVisible(node) &&
                  !el.contains(node) &&
                  domNodeToCleanText(node).replace(/\s+/g, " ").trim() ===
                    titleHint,
              );
              if (titles.length) {
                const candidates = new Set(
                  Array.from(header.querySelectorAll("p"))
                    .filter((node) => isNodeVisible(node) && !el.contains(node))
                    .map((node) => domNodeToCleanText(node))
                    .filter((text) => text.includes("·"))
                    .map((text) => text.split("·")[0].trim())
                    .filter(
                      (text) =>
                        text &&
                        text !== titleHint &&
                        text !== company &&
                        !/applicants|ago|hours?|minutes?|başvuru|önce/i.test(
                          text,
                        ),
                    ),
                );
                if (!location && candidates.size === 1)
                  location = Array.from(candidates)[0];
                matchedTitles.add(titleHint);
                break;
              }
            }
          });
          if (matchedTitles.size === 1) position = Array.from(matchedTitles)[0];
        }
      }
      if (!description) {
        const semanticDescriptions = new Set();
        scope.querySelectorAll('h2, [role="heading"]').forEach((heading) => {
          if (!isNodeVisible(heading) || isInsideExcludedContainer(heading))
            return;
          const label = domNodeToCleanText(heading).trim();
          if (!/^(About the job|İş ilanı hakkında|İş hakkında)$/i.test(label))
            return;
          let block = heading.parentElement;
          for (
            let depth = 0;
            block && depth < 4;
            depth++, block = block.parentElement
          ) {
            if (block === document.body || block === document.documentElement)
              break;
            const boxes = Array.from(
              block.querySelectorAll('[data-testid="expandable-text-box"]'),
            ).filter(
              (el) => isNodeVisible(el) && !isInsideExcludedContainer(el),
            );
            if (boxes.length) {
              if (boxes.length === 1) {
                // Saved HTML can repair invalid p/span nesting and move the
                // paragraphs out of the expandable span. Limit fallback to
                // this one identified About-the-job section, never the page.
                const text =
                  domNodeToCleanText(boxes[0]) ||
                  domNodeToCleanText(block).replace(
                    /^(About the job|İş ilanı hakkında|İş hakkında)\s*/i,
                    "",
                  );
                if (text) semanticDescriptions.add(text);
              }
              break;
            }
          }
        });
        if (semanticDescriptions.size === 1 && company && position)
          description = Array.from(semanticDescriptions)[0];
      }

      if (position || company || description) {
        sourceType = "linkedin";
      }

      // If active job ID matches structured data, select same structured job to supplement missing fields
      if (activeJobId && allJobCandidates.length > 0) {
        const matchingJob = findMatchingLinkedInJobLd(
          allJobCandidates,
          activeJobId,
        );
        if (matchingJob) {
          if (!company) company = extractCompanyFromJsonLd(matchingJob);
          if (!position) position = extractPositionFromJsonLd(matchingJob);
          if (!description)
            description = extractDescriptionFromJsonLd(matchingJob);
          if (sourceType === "none") sourceType = "structured";
        }
      }

      // LinkedIn capture is automatic. Selections (even in the description)
      // must never replace the complete, identified job description.

      // No whole-body dump fallback on LinkedIn
      if (!company && !position && !description && !warning) {
        warning = "unrecognized_linkedin";
        sourceType = "none";
      }
    }
  } else {
    // Non-LinkedIn: single JSON-LD still priority
    if (allJobCandidates.length === 1) {
      const singleJob = allJobCandidates[0];
      company = extractCompanyFromJsonLd(singleJob);
      position = extractPositionFromJsonLd(singleJob);
      description = extractDescriptionFromJsonLd(singleJob);
      sourceType = "structured";
    }

    // Fallback for description: user selection first, then live visible DOM text
    if (!description) {
      const selected = getSafeSelectedText();
      if (selected) {
        description = selected;
        sourceType = "selection";
      } else {
        description = getVisibleLiveDomText();
        if (description) {
          sourceType = "visible";
        }
      }
    }
  }

  // Never infer position from arbitrary document.title

  const missingFields = [];
  if (!company) missingFields.push("company");
  if (!position) missingFields.push("position");
  if (!description) missingFields.push("description");
  if (!canonicalUrl) missingFields.push("sourceUrl");

  return {
    company: (company || "").slice(0, 255),
    location: location.slice(0, 255),
    position: (position || "").slice(0, 255),
    description: (description || "").slice(0, MAX_DESCRIPTION_LENGTH),
    sourceUrl: (canonicalUrl || "").slice(0, 2048),
    sourceType: sourceType,
    missingFields: missingFields,
    warning: warning,
  };
})();
