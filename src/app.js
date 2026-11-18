// ============================================================
// Tab Navigation
// ============================================================
document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetTab = btn.getAttribute("data-tab");

    // Update nav buttons
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // Update tab panels
    document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
    document.getElementById(targetTab).classList.add("active");
  });
});

// ============================================================
// View History Tab
// ============================================================
const historySearchInput = document.getElementById("historySearchInput");
const historyTimeRange = document.getElementById("historyTimeRange");
const searchHistoryBtn = document.getElementById("searchHistoryBtn");
const historyResultsSummary = document.getElementById("historyResultsSummary");
const historyPageSizeSelect = document.getElementById("historyPageSizeSelect");
const historyTableBody = document.getElementById("historyTableBody");
const historyPageInfo = document.getElementById("historyPageInfo");
const historyFirstPageBtn = document.getElementById("historyFirstPageBtn");
const historyPrevPageBtn = document.getElementById("historyPrevPageBtn");
const historyNextPageBtn = document.getElementById("historyNextPageBtn");
const historyLastPageBtn = document.getElementById("historyLastPageBtn");

let allHistoryRecords = [];
let historyFilteredRecords = [];
let historyCurrentPage = 1;
let historyPageSize = parseInt(historyPageSizeSelect.value, 10);
let historySearchDebounceTimer = null;

function getStartTimeForRange(range) {
  const now = Date.now();
  switch (range) {
    case "today":
      return new Date(now - 86400000).getTime();
    case "week":
      return new Date(now - 7 * 86400000).getTime();
    case "month":
      return new Date(now - 30 * 86400000).getTime();
    default:
      return 0;
  }
}

async function fetchHistory() {
  const timeRange = historyTimeRange.value;
  const startTime = getStartTimeForRange(timeRange);

  searchHistoryBtn.disabled = true;
  searchHistoryBtn.textContent = "Loading...";
  historyResultsSummary.textContent = "Loading history...";

  try {
    const results = await browser.history.search({ text: "", maxResults: 100000, startTime: startTime });

    allHistoryRecords = results.map((item) => ({
      title: item.title || "",
      url: item.url,
      visitCount: item.visitCount || 1
    }));

    // Filter out non-http(s) URLs
    allHistoryRecords = allHistoryRecords.filter((r) => {
      try {
        const parsed = new URL(r.url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    });

    // Apply current filter (search text) to the freshly fetched data
    applyHistoryFilter();
  } catch (err) {
    historyResultsSummary.textContent = `Error: ${err.message}`;
  } finally {
    searchHistoryBtn.disabled = false;
    searchHistoryBtn.textContent = "Refresh";
  }
}

function renderHistoryTablePage() {
  const totalItems = historyFilteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / historyPageSize));
  if (historyCurrentPage > totalPages) historyCurrentPage = totalPages;

  const startIdx = (historyCurrentPage - 1) * historyPageSize;
  const endIdx = Math.min(startIdx + historyPageSize, totalItems);
  const slice = historyFilteredRecords.slice(startIdx, endIdx);

  historyTableBody.innerHTML = "";

  if (slice.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.textContent = "No history entries found.";
    td.style.textAlign = "center";
    td.style.color = "var(--muted)";
    tr.appendChild(td);
    historyTableBody.appendChild(tr);
  } else {
    slice.forEach((rec, idx) => {
      const tr = document.createElement("tr");

      const tdIndex = document.createElement("td");
      tdIndex.textContent = startIdx + idx + 1;

      const tdTitle = document.createElement("td");
      tdTitle.className = "cell-title";
      tdTitle.textContent = rec.title || "(No title)";

      const tdUrl = document.createElement("td");
      const urlSpan = document.createElement("span");
      urlSpan.className = "url-pill url-new";
      urlSpan.textContent = rec.url;
      tdUrl.appendChild(urlSpan);

      const tdVisits = document.createElement("td");
      tdVisits.className = "col-visits";
      tdVisits.textContent = rec.visitCount || 1;

      tr.append(tdIndex, tdTitle, tdUrl, tdVisits);
      historyTableBody.appendChild(tr);
    });
  }

  historyResultsSummary.textContent =
    totalItems > 0 ? `Showing ${totalItems} history entry(ies)` : "No results.";

  historyPageInfo.textContent =
    totalItems > 0
      ? `Rows ${startIdx + 1}–${endIdx} of ${totalItems} (Page ${historyCurrentPage} of ${totalPages})`
      : "0 rows";

  historyFirstPageBtn.disabled = historyCurrentPage <= 1;
  historyPrevPageBtn.disabled = historyCurrentPage <= 1;
  historyNextPageBtn.disabled = historyCurrentPage >= totalPages;
  historyLastPageBtn.disabled = historyCurrentPage >= totalPages;
}

function applyHistoryFilter() {
  const query = historySearchInput.value.trim().toLowerCase();
  if (!query) {
    historyFilteredRecords = [...allHistoryRecords];
  } else {
    historyFilteredRecords = allHistoryRecords.filter(
      (r) =>
        r.url.toLowerCase().includes(query) ||
        (r.title && r.title.toLowerCase().includes(query))
    );
  }
  historyCurrentPage = 1;
  renderHistoryTablePage();
}

// Reactive search filter with debounce — filters client-side as the user types
historySearchInput.addEventListener("input", () => {
  clearTimeout(historySearchDebounceTimer);
  historySearchDebounceTimer = setTimeout(() => {
    applyHistoryFilter();
  }, 300);
});

// Allow pressing Enter in the search input (no longer needed for triggering, but harmless)
historySearchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    clearTimeout(historySearchDebounceTimer);
    applyHistoryFilter();
  }
});

// Refresh button re-fetches history from the browser API
searchHistoryBtn.addEventListener("click", () => {
  fetchHistory();
});

// Time range change triggers a re-fetch from the browser API
historyTimeRange.addEventListener("change", () => {
  fetchHistory();
});

historyPageSizeSelect.addEventListener("change", () => {
  historyPageSize = parseInt(historyPageSizeSelect.value, 10);
  historyCurrentPage = 1;
  renderHistoryTablePage();
});

historyFirstPageBtn.addEventListener("click", () => {
  historyCurrentPage = 1;
  renderHistoryTablePage();
});

historyPrevPageBtn.addEventListener("click", () => {
  if (historyCurrentPage > 1) {
    historyCurrentPage--;
    renderHistoryTablePage();
  }
});

historyNextPageBtn.addEventListener("click", () => {
  const totalPages = Math.ceil(historyFilteredRecords.length / historyPageSize);
  if (historyCurrentPage < totalPages) {
    historyCurrentPage++;
    renderHistoryTablePage();
  }
});

historyLastPageBtn.addEventListener("click", () => {
  historyCurrentPage = Math.max(1, Math.ceil(historyFilteredRecords.length / historyPageSize));
  renderHistoryTablePage();
});

// Auto-load all history when the page opens
fetchHistory();

// ============================================================
// Migrate URLs Tab
// ============================================================
const oldDomainInput = document.getElementById("oldDomain");
const newDomainInput = document.getElementById("newDomain");
const includeSubdomainsInput = document.getElementById("includeSubdomains");
const deleteOldInput = document.getElementById("deleteOld");
const previewBtn = document.getElementById("previewBtn");
const migrateBtn = document.getElementById("migrateBtn");
const statusBar = document.getElementById("statusBar");

const resultsSection = document.getElementById("resultsSection");
const resultsSummary = document.getElementById("resultsSummary");
const filterInput = document.getElementById("filterInput");
const pageSizeSelect = document.getElementById("pageSizeSelect");
const previewTableBody = document.getElementById("previewTableBody");
const pageInfo = document.getElementById("pageInfo");

const firstPageBtn = document.getElementById("firstPageBtn");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const lastPageBtn = document.getElementById("lastPageBtn");

// Application state for preview & pagination
let allMatchedRecords = [];
let filteredRecords = [];
let currentPage = 1;
let pageSize = parseInt(pageSizeSelect.value, 10);

function setStatus(message, type = "info") {
  statusBar.textContent = message;
  statusBar.className = `status-bar ${type === "error" ? "error" : type === "success" ? "success" : ""}`;
  statusBar.classList.remove("hidden");
}

function normalizeDomain(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

function isValidDomain(domain) {
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) && !domain.startsWith(".") && !domain.endsWith(".");
}

function matchesDomain(hostname, oldDomain, newDomain, includeSubdomains) {
  const host = hostname.toLowerCase();
  if (host === newDomain || host.endsWith("." + newDomain)) {
    return false;
  }
  if (host === oldDomain) return true;
  if (includeSubdomains && host.endsWith("." + oldDomain)) return true;
  return false;
}

function replaceHost(urlObj, oldDomain, newDomain) {
  const host = urlObj.hostname.toLowerCase();
  if (host === oldDomain) {
    urlObj.hostname = newDomain;
  } else if (host.endsWith("." + oldDomain)) {
    const subdomainPrefix = host.slice(0, -(oldDomain.length + 1));
    urlObj.hostname = `${subdomainPrefix}.${newDomain}`;
  }
  return urlObj.toString();
}

function validateInputs() {
  const oldDomain = normalizeDomain(oldDomainInput.value);
  const newDomain = normalizeDomain(newDomainInput.value);

  if (!oldDomain || !newDomain) {
    return { error: "Please enter both the old and new domains." };
  }
  if (!isValidDomain(oldDomain) || !isValidDomain(newDomain)) {
    return { error: "Please enter valid full domains (e.g., oldsite.com and newsite.com)." };
  }
  if (oldDomain === newDomain) {
    return { error: "Old and new domains must be different." };
  }
  return { oldDomain, newDomain };
}

async function findMatchingRecords(oldDomain, newDomain, includeSubdomains) {
  const results = await browser.history.search({
    text: oldDomain,
    startTime: 0,
    maxResults: 100000
  });

  const matched = [];
  for (const item of results) {
    try {
      const parsed = new URL(item.url);
      if (
        (parsed.protocol === "http:" || parsed.protocol === "https:") &&
        matchesDomain(parsed.hostname, oldDomain, newDomain, includeSubdomains)
      ) {
        matched.push({
          title: item.title || "(No title)",
          oldUrl: item.url,
          newUrl: replaceHost(new URL(item.url), oldDomain, newDomain),
          visitCount: item.visitCount || 1
        });
      }
    } catch {
      // Skip malformed URLs
    }
  }
  return matched;
}

function renderTablePage() {
  const totalItems = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalItems);
  const slice = filteredRecords.slice(startIdx, endIdx);

  previewTableBody.innerHTML = "";

  if (slice.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "No matching records on this view.";
    td.style.textAlign = "center";
    td.style.color = "#5b5b66";
    tr.appendChild(td);
    previewTableBody.appendChild(tr);
  } else {
    slice.forEach((rec, idx) => {
      const tr = document.createElement("tr");

      const tdIndex = document.createElement("td");
      tdIndex.textContent = startIdx + idx + 1;

      const tdTitle = document.createElement("td");
      tdTitle.className = "cell-title";
      tdTitle.textContent = rec.title;

      const tdOld = document.createElement("td");
      const oldDiv = document.createElement("div");
      oldDiv.className = "url-pill url-old";
      oldDiv.textContent = rec.oldUrl;
      tdOld.appendChild(oldDiv);

      const tdNew = document.createElement("td");
      const newDiv = document.createElement("div");
      newDiv.className = "url-pill url-new";
      newDiv.textContent = rec.newUrl;
      tdNew.appendChild(newDiv);

      const tdVisits = document.createElement("td");
      tdVisits.className = "col-visits";
      tdVisits.textContent = rec.visitCount;

      tr.append(tdIndex, tdTitle, tdOld, tdNew, tdVisits);
      previewTableBody.appendChild(tr);
    });
  }

  const totalVisits = filteredRecords.reduce((sum, r) => sum + r.visitCount, 0);
  resultsSummary.textContent =
    filteredRecords.length === allMatchedRecords.length
      ? `Showing ${allMatchedRecords.length} unique URL(s) (~${totalVisits} total visits)`
      : `Filtered: ${filteredRecords.length} of ${allMatchedRecords.length} URL(s)`;

  pageInfo.textContent =
    totalItems > 0
      ? `Rows ${startIdx + 1}–${endIdx} of ${totalItems} (Page ${currentPage} of ${totalPages})`
      : "0 rows";

  firstPageBtn.disabled = currentPage <= 1;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
  lastPageBtn.disabled = currentPage >= totalPages;
}

function applyFilter() {
  const query = filterInput.value.trim().toLowerCase();
  if (!query) {
    filteredRecords = [...allMatchedRecords];
  } else {
    filteredRecords = allMatchedRecords.filter(
      (r) =>
        r.oldUrl.toLowerCase().includes(query) ||
        r.newUrl.toLowerCase().includes(query) ||
        r.title.toLowerCase().includes(query)
    );
  }
  currentPage = 1;
  renderTablePage();
}

previewBtn.addEventListener("click", async () => {
  const { oldDomain, newDomain, error } = validateInputs();
  if (error) {
    setStatus(error, "error");
    return;
  }

  previewBtn.disabled = true;
  setStatus("Searching Firefox history...");

  try {
    allMatchedRecords = await findMatchingRecords(
      oldDomain,
      newDomain,
      includeSubdomainsInput.checked
    );

    if (allMatchedRecords.length === 0) {
      resultsSection.classList.add("hidden");
      setStatus(`No history entries found for ${oldDomain}.`, "info");
      return;
    }

    filterInput.value = "";
    filteredRecords = [...allMatchedRecords];
    currentPage = 1;
    resultsSection.classList.remove("hidden");
    renderTablePage();
    setStatus(`Preview ready: ${allMatchedRecords.length} unique URL(s) found.`, "success");
  } catch (err) {
    setStatus(`Error: ${err.message}`, "error");
  } finally {
    previewBtn.disabled = false;
  }
});

migrateBtn.addEventListener("click", async () => {
  const { oldDomain, newDomain, error } = validateInputs();
  if (error) {
    setStatus(error, "error");
    return;
  }

  const includeSubdomains = includeSubdomainsInput.checked;
  const deleteOld = deleteOldInput.checked;

  previewBtn.disabled = true;
  migrateBtn.disabled = true;
  setStatus("Scanning history for migration...");

  try {
    const records = await findMatchingRecords(oldDomain, newDomain, includeSubdomains);

    if (records.length === 0) {
      setStatus(`No history entries found for ${oldDomain}.`, "info");
      return;
    }

    let migratedUrls = 0;
    let migratedVisits = 0;

    for (const rec of records) {
      const visits = await browser.history.getVisits({ url: rec.oldUrl });
      if (!visits || visits.length === 0) continue;

      let addedForThisUrl = 0;
      for (const visit of visits) {
        try {
          await browser.history.addUrl({
            url: rec.newUrl,
            title: rec.title !== "(No title)" ? rec.title : undefined,
            transition: visit.transition || "link",
            visitTime: visit.visitTime
          });
        } catch {
          await browser.history.addUrl({
            url: rec.newUrl,
            title: rec.title !== "(No title)" ? rec.title : undefined,
            transition: "link",
            visitTime: visit.visitTime
          });
        }
        addedForThisUrl++;
        migratedVisits++;
      }

      if (deleteOld && addedForThisUrl === visits.length) {
        await browser.history.deleteUrl({ url: rec.oldUrl });
      }

      migratedUrls++;
      if (migratedUrls % 10 === 0 || migratedUrls === records.length) {
        setStatus(`Migrating... (${migratedUrls} / ${records.length} URLs)`);
      }
    }

    setStatus(
      `Migration complete! Copied ${migratedVisits} visit(s) across ${migratedUrls} URL(s) to ${newDomain}.`,
      "success"
    );
  } catch (err) {
    setStatus(`Error during migration: ${err.message}`, "error");
  } finally {
    previewBtn.disabled = false;
    migrateBtn.disabled = false;
  }
});

// Filter & Pagination Event Listeners
filterInput.addEventListener("input", applyFilter);

pageSizeSelect.addEventListener("change", () => {
  pageSize = parseInt(pageSizeSelect.value, 10);
  currentPage = 1;
  renderTablePage();
});

firstPageBtn.addEventListener("click", () => {
  currentPage = 1;
  renderTablePage();
});

prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderTablePage();
  }
});

nextPageBtn.addEventListener("click", () => {
  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  if (currentPage < totalPages) {
    currentPage++;
    renderTablePage();
  }
});

lastPageBtn.addEventListener("click", () => {
  currentPage = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  renderTablePage();
});