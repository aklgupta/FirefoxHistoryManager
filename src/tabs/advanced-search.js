// ============================================================
// Advanced Search Tab
// ============================================================

const AdvancedSearchTab = {
  allRecords: [],
  filteredRecords: [],
  visitsMap: new Map(), // url -> { lastVisit, visitTimes[] }

  init() {
    const keywordInput = document.getElementById("advKeyword");
    const domainInput = document.getElementById("advDomain");
    const dateFromInput = document.getElementById("advDateFrom");
    const dateToInput = document.getElementById("advDateTo");
    const sortFieldSelect = document.getElementById("advSortField");
    const sortDirectionSelect = document.getElementById("advSortDirection");
    const searchBtn = document.getElementById("advSearchBtn");
    const exportBtn = document.getElementById("advExportBtn");
    const resultsSummary = document.getElementById("advResultsSummary");
    const pageSizeSelect = document.getElementById("advPageSizeSelect");
    const tableBody = document.getElementById("advTableBody");
    const pageInfo = document.getElementById("advPageInfo");
    const firstPageBtn = document.getElementById("advFirstPageBtn");
    const prevPageBtn = document.getElementById("advPrevPageBtn");
    const nextPageBtn = document.getElementById("advNextPageBtn");
    const lastPageBtn = document.getElementById("advLastPageBtn");

    // Initialize shared pagination
    Pagination.init("advanced-search", pageSizeSelect, firstPageBtn, prevPageBtn, nextPageBtn, lastPageBtn, () => {
      this.renderTablePage(tableBody, pageInfo, resultsSummary);
    });

    // Search button
    searchBtn.addEventListener("click", () => {
      this.performSearch(
        searchBtn, resultsSummary, exportBtn, keywordInput, domainInput,
        dateFromInput, dateToInput, sortFieldSelect, sortDirectionSelect,
        tableBody, pageInfo
      );
    });

    // Export CSV button
    exportBtn.addEventListener("click", () => {
      this.exportCSV();
    });
  },

  /**
   * Main search: fetch history, apply filters, sort, and render.
   */
  async performSearch(searchBtn, resultsSummary, exportBtn, keywordInput, domainInput,
                       dateFromInput, dateToInput, sortFieldSelect, sortDirectionSelect,
                       tableBody, pageInfo) {
    searchBtn.disabled = true;
    searchBtn.textContent = "Searching...";
    resultsSummary.textContent = "Searching history...";
    exportBtn.disabled = true;

    try {
      // Fetch all history
      const records = await HistoryAPI.search(0);
      this.allRecords = HistoryAPI.filterHttpHttps(records);

      // Reset visits cache
      this.visitsMap.clear();

      // If date range filter is active, pre-fetch all visits for filtering
      const hasDateRange = !!dateFromInput.value || !!dateToInput.value;
      if (hasDateRange) {
        resultsSummary.textContent = "Fetching visit timestamps...";
        const allUrls = this.allRecords.map((r) => r.url);
        const batch = await HistoryAPI.getVisitsBatch(allUrls);
        batch.forEach((visits, url) => {
          if (visits && visits.length > 0) {
            visits.sort((a, b) => b.visitTime - a.visitTime);
            this.visitsMap.set(url, { lastVisit: visits[0].visitTime, visitTimes: visits.map((v) => v.visitTime) });
          } else {
            this.visitsMap.set(url, { lastVisit: 0, visitTimes: [] });
          }
        });
      }

      // Apply client-side filters
      this.filteredRecords = this.applyFilters(
        this.allRecords,
        keywordInput.value.trim().toLowerCase(),
        Filtering.normalizeDomainQuery(domainInput.value),
        dateFromInput.value,
        dateToInput.value
      );

      // Apply sorting
      this.applySorting(
        this.filteredRecords,
        sortFieldSelect.value,
        sortDirectionSelect.value
      );

      Pagination.reset();

      // Enable export if there are results
      exportBtn.disabled = this.filteredRecords.length === 0;

      this.renderTablePage(tableBody, pageInfo, resultsSummary);
    } catch (err) {
      resultsSummary.textContent = `Error: ${err.message}`;
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = "Search";
    }
  },

  /**
   * Filter records by keyword, domain, and date/time range.
   */
  applyFilters(records, keyword, domain, dateFrom, dateTo) {
    let result = records;

    // Keyword filter (title or URL)
    if (keyword) {
      result = result.filter((r) => Filtering.matchFields(r, keyword, ["title", "url"]));
    }

    // Domain filter
    if (domain) {
      result = result.filter((r) => Filtering.matchDomain(r, domain));
    }

    // Date/time range filter — requires visit timestamps
    if (dateFrom || dateTo) {
      const fromMs = dateFrom ? new Date(dateFrom).getTime() : 0;
      const toMs = dateTo ? new Date(dateTo).getTime() : Infinity;
      result = result.filter((r) => {
        const visits = this.visitsMap.get(r.url);
        if (!visits || visits.visitTimes.length === 0) return false;
        return visits.visitTimes.some((vt) => vt.visitTime >= fromMs && vt.visitTime <= toMs);
      });
    }

    return result;
  },

  /**
   * Sort records by the selected field and direction.
   */
  applySorting(records, field, direction) {
    const dir = direction === "asc" ? 1 : -1;

    records.sort((a, b) => {
      let valA, valB;

      if (field === "lastVisit") {
        // Use visit timestamps if available, otherwise fall back to visitCount as a proxy
        const visitsA = this.visitsMap.get(a.url);
        const visitsB = this.visitsMap.get(b.url);
        valA = visitsA ? visitsA.lastVisit : 0;
        valB = visitsB ? visitsB.lastVisit : 0;
      } else if (field === "visitCount") {
        valA = a.visitCount || 0;
        valB = b.visitCount || 0;
      } else if (field === "title") {
        valA = (a.title || "").toLowerCase();
        valB = (b.title || "").toLowerCase();
      } else {
        // url
        valA = a.url.toLowerCase();
        valB = b.url.toLowerCase();
      }

      if (typeof valA === "string") {
        return valA < valB ? -1 * dir : valA > valB ? 1 * dir : 0;
      }
      return (valA - valB) * dir;
    });
  },

  /**
   * Fetch visit data for the current page's URLs.
   */
  async fetchVisitsForPage(records) {
    if (records.length === 0) return;
    const urls = records.map((r) => r.url);
    const batch = await HistoryAPI.getVisitsBatch(urls);

    batch.forEach((visits, url) => {
      if (visits && visits.length > 0) {
        // Sort visits by visitTime descending
        visits.sort((a, b) => b.visitTime - a.visitTime);
        const lastVisit = visits[0].visitTime;
        const visitTimes = visits.map((v) => v.visitTime);
        this.visitsMap.set(url, { lastVisit, visitTimes });
      } else {
        this.visitsMap.set(url, { lastVisit: 0, visitTimes: [] });
      }
    });
  },

  /**
   * Render the current page of the results table.
   */
  async renderTablePage(tableBody, pageInfo, resultsSummary) {
    Pagination.setActive("advanced-search");
    const totalItems = this.filteredRecords.length;
    Pagination.setTotalItems(totalItems);
    const { startIdx, endIdx, totalPages } = Pagination.getSliceIndices(totalItems);
    const slice = this.filteredRecords.slice(startIdx, endIdx);

    // Fetch visit data for the current page
    if (slice.length > 0) {
      await this.fetchVisitsForPage(slice);
    }

    tableBody.innerHTML = "";

    if (slice.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 7;
      td.textContent = totalItems === 0 && !resultsSummary.textContent.includes("Searching")
        ? "Run a search to see results."
        : "No history entries found.";
      td.style.textAlign = "center";
      td.style.color = "var(--muted)";
      tr.appendChild(td);
      tableBody.appendChild(tr);
    } else {
      slice.forEach((rec, idx) => {
        const tr = document.createElement("tr");

        // Index
        const tdIndex = document.createElement("td");
        tdIndex.textContent = startIdx + idx + 1;

        // Title
        const tdTitle = document.createElement("td");
        tdTitle.className = "cell-title";
        tdTitle.textContent = rec.title || "(No title)";

        // URL
        const tdUrl = document.createElement("td");
        const urlSpan = document.createElement("span");
        urlSpan.className = "url-pill";
        urlSpan.textContent = rec.url;
        tdUrl.appendChild(urlSpan);

        // Domain
        const tdDomain = document.createElement("td");
        const domainSpan = document.createElement("span");
        domainSpan.className = "domain-cell";
        domainSpan.textContent = Filtering.extractDomain(rec.url);
        tdDomain.appendChild(domainSpan);

        // Last Visit
        const tdLastVisit = document.createElement("td");
        const visits = this.visitsMap.get(rec.url);
        const lastVisitSpan = document.createElement("span");
        lastVisitSpan.className = "last-visit-cell";
        if (visits && visits.lastVisit) {
          lastVisitSpan.textContent = this.formatDateTime(visits.lastVisit);
        } else {
          lastVisitSpan.textContent = "—";
        }
        tdLastVisit.appendChild(lastVisitSpan);

        // Visit Count
        const tdVisits = document.createElement("td");
        tdVisits.className = "col-visits";
        tdVisits.textContent = rec.visitCount || 1;

        // Visit Times
        const tdVisitTimes = document.createElement("td");
        if (visits && visits.visitTimes.length > 0) {
          const timesDiv = document.createElement("div");
          timesDiv.className = "visit-times-list";
          // Show up to 5 visit times
          const maxShow = Math.min(visits.visitTimes.length, 5);
          for (let i = 0; i < maxShow; i++) {
            const chip = document.createElement("span");
            chip.className = "visit-time-chip";
            chip.textContent = this.formatDateTimeShort(visits.visitTimes[i]);
            timesDiv.appendChild(chip);
          }
          if (visits.visitTimes.length > 5) {
            const more = document.createElement("span");
            more.className = "visit-time-chip";
            more.textContent = `+${visits.visitTimes.length - 5} more`;
            timesDiv.appendChild(more);
          }
          tdVisitTimes.appendChild(timesDiv);
        } else {
          tdVisitTimes.textContent = "—";
          tdVisitTimes.style.color = "var(--muted)";
          tdVisitTimes.style.fontSize = "12px";
        }

        tr.append(tdIndex, tdTitle, tdUrl, tdDomain, tdLastVisit, tdVisits, tdVisitTimes);
        tableBody.appendChild(tr);
      });
    }

    resultsSummary.textContent =
      totalItems > 0 ? `Showing ${totalItems} result(s)` : "No results.";

    pageInfo.textContent =
      totalItems > 0
        ? `Rows ${startIdx + 1}–${endIdx} of ${totalItems} (Page ${Pagination.currentPage} of ${totalPages})`
        : "0 rows";

    Pagination.updateControls(totalItems, pageInfo);
  },

  /**
   * Format epoch ms to a readable date/time string.
   */
  formatDateTime(epochMs) {
    const d = new Date(epochMs);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  /**
   * Format epoch ms to a short date/time string.
   */
  formatDateTimeShort(epochMs) {
    const d = new Date(epochMs);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${month}/${day} ${hours}:${minutes}`;
  },

  /**
   * Export filtered results to CSV.
   */
  exportCSV() {
    if (this.filteredRecords.length === 0) return;

    const headers = ["#", "Title", "URL", "Domain", "Last Visit", "Visit Count", "Visit Times"];
    const rows = this.filteredRecords.map((rec, idx) => {
      const domain = Filtering.extractDomain(rec.url);
      const visits = this.visitsMap.get(rec.url);
      const lastVisit = visits && visits.lastVisit ? this.formatDateTime(visits.lastVisit) : "";
      const visitTimes = visits && visits.visitTimes.length > 0
        ? visits.visitTimes.map((vt) => this.formatDateTime(vt)).join(" | ")
        : "";
      return [
        idx + 1,
        this.csvEscape(rec.title || ""),
        this.csvEscape(rec.url),
        this.csvEscape(domain),
        lastVisit,
        rec.visitCount || 1,
        visitTimes
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `advanced_search_results_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Escape a value for CSV (wrap in quotes if it contains commas, quotes, or newlines).
   */
  csvEscape(value) {
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }
};
