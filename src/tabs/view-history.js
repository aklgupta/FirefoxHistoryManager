// ============================================================
// View History Tab
// ============================================================

const ViewHistoryTab = {
  allRecords: [],
  filteredRecords: [],

  init() {
    const searchInput = document.getElementById("historySearchInput");
    const timeRange = document.getElementById("historyTimeRange");
    const searchBtn = document.getElementById("searchHistoryBtn");
    const resultsSummary = document.getElementById("historyResultsSummary");
    const pageSizeSelect = document.getElementById("historyPageSizeSelect");
    const tableBody = document.getElementById("historyTableBody");
    const pageInfo = document.getElementById("historyPageInfo");
    const firstPageBtn = document.getElementById("historyFirstPageBtn");
    const prevPageBtn = document.getElementById("historyPrevPageBtn");
    const nextPageBtn = document.getElementById("historyNextPageBtn");
    const lastPageBtn = document.getElementById("historyLastPageBtn");

    // Initialize shared pagination
    Pagination.init(pageSizeSelect, firstPageBtn, prevPageBtn, nextPageBtn, lastPageBtn, () => {
      this.renderTablePage(tableBody, pageInfo, resultsSummary);
    });

    // Debounced filter
    Filtering.createDebouncedFilter(
      searchInput,
      () => this.allRecords,
      (record, query) => Filtering.matchFields(record, query, ["url", "title"]),
      (filtered) => {
        this.filteredRecords = filtered;
        Pagination.reset();
        this.renderTablePage(tableBody, pageInfo, resultsSummary);
      },
      300
    );

    // Refresh button re-fetches history from the browser API
    searchBtn.addEventListener("click", () => {
      this.fetchHistory(searchBtn, resultsSummary, timeRange);
    });

    // Time range change triggers a re-fetch from the browser API
    timeRange.addEventListener("change", () => {
      this.fetchHistory(searchBtn, resultsSummary, timeRange);
    });

    // Auto-load all history when the page opens
    this.fetchHistory(searchBtn, resultsSummary, timeRange);
  },

  async fetchHistory(searchBtn, resultsSummary, timeRange) {
    const startTime = getStartTimeForRange(timeRange.value);

    searchBtn.disabled = true;
    searchBtn.textContent = "Loading...";
    resultsSummary.textContent = "Loading history...";

    try {
      const records = await HistoryAPI.search(startTime);
      this.allRecords = HistoryAPI.filterHttpHttps(records);
      this.filteredRecords = [...this.allRecords];
      Pagination.reset();
      this.renderTablePage(
        document.getElementById("historyTableBody"),
        document.getElementById("historyPageInfo"),
        resultsSummary
      );
    } catch (err) {
      resultsSummary.textContent = `Error: ${err.message}`;
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = "Refresh";
    }
  },

  renderTablePage(tableBody, pageInfo, resultsSummary) {
    const totalItems = this.filteredRecords.length;
    Pagination.setTotalItems(totalItems);
    const { startIdx, endIdx, totalPages } = Pagination.getSliceIndices(totalItems);
    const slice = this.filteredRecords.slice(startIdx, endIdx);

    tableBody.innerHTML = "";

    if (slice.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.textContent = "No history entries found.";
      td.style.textAlign = "center";
      td.style.color = "var(--muted)";
      tr.appendChild(td);
      tableBody.appendChild(tr);
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
        tableBody.appendChild(tr);
      });
    }

    resultsSummary.textContent =
      totalItems > 0 ? `Showing ${totalItems} history entry(ies)` : "No results.";

    pageInfo.textContent =
      totalItems > 0
        ? `Rows ${startIdx + 1}–${endIdx} of ${totalItems} (Page ${Pagination.currentPage} of ${totalPages})`
        : "0 rows";

    Pagination.updateControls(totalItems, pageInfo);
  }
};

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
