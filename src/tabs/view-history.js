// ============================================================
// View History Tab
// ============================================================

const ViewHistoryTab = {
  allRecords: [],
  filteredRecords: [],
  selectedUrls: new Set(),

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
    const selectAllCheckbox = document.getElementById("historySelectAll");
    const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
    const selectedCountSpan = document.getElementById("selectedCount");

    // Initialize shared pagination
    Pagination.init(pageSizeSelect, firstPageBtn, prevPageBtn, nextPageBtn, lastPageBtn, () => {
      this.renderTablePage(tableBody, pageInfo, resultsSummary, selectAllCheckbox);
    });

    // Debounced filter
    Filtering.createDebouncedFilter(
      searchInput,
      () => this.allRecords,
      (record, query) => Filtering.matchFields(record, query, ["url", "title"]),
      (filtered) => {
        this.filteredRecords = filtered;
        Pagination.reset();
        this.renderTablePage(tableBody, pageInfo, resultsSummary, selectAllCheckbox);
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

    // Select all checkbox (current page only)
    selectAllCheckbox.addEventListener("change", () => {
      const checked = selectAllCheckbox.checked;
      const { startIdx, endIdx } = Pagination.getSliceIndices(this.filteredRecords.length);
      const pageSlice = this.filteredRecords.slice(startIdx, endIdx);
      pageSlice.forEach((rec) => {
        if (checked) {
          this.selectedUrls.add(rec.url);
        } else {
          this.selectedUrls.delete(rec.url);
        }
      });
      this.renderTablePage(tableBody, pageInfo, resultsSummary, selectAllCheckbox);
    });

    // Delete selected button
    deleteSelectedBtn.addEventListener("click", () => {
      this.deleteSelected(deleteSelectedBtn, selectedCountSpan, resultsSummary, selectAllCheckbox);
    });

    // Auto-load all history when the page opens
    this.fetchHistory(searchBtn, resultsSummary, timeRange);
  },

  /** Update the "Delete selected" button state and count display */
  updateSelectionUI(deleteSelectedBtn, selectedCountSpan) {
    const count = this.selectedUrls.size;
    if (selectedCountSpan) {
      selectedCountSpan.textContent = count;
    }
    if (deleteSelectedBtn) {
      deleteSelectedBtn.disabled = count === 0;
    }
  },

  /** Delete all currently selected URLs */
  async deleteSelected(deleteSelectedBtn, selectedCountSpan, resultsSummary, selectAllCheckbox) {
    const urlsToDelete = Array.from(this.selectedUrls);
    if (urlsToDelete.length === 0) return;

    deleteSelectedBtn.disabled = true;
    deleteSelectedBtn.textContent = "Deleting...";
    resultsSummary.textContent = `Deleting ${urlsToDelete.length} item(s)...`;

    let successCount = 0;
    let errorCount = 0;

    for (const url of urlsToDelete) {
      try {
        await HistoryAPI.deleteUrl(url);
        successCount++;
        // Remove from allRecords and filteredRecords
        this.removeRecordByUrl(url);
      } catch (err) {
        errorCount++;
        console.error(`Failed to delete ${url}:`, err);
      }
    }

    // Clear selection
    this.selectedUrls.clear();
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false;
    }

    this.updateSelectionUI(deleteSelectedBtn, selectedCountSpan);
    Pagination.reset();
    this.renderTablePage(
      document.getElementById("historyTableBody"),
      document.getElementById("historyPageInfo"),
      resultsSummary,
      selectAllCheckbox
    );

    let message = `Deleted ${successCount} item(s).`;
    if (errorCount > 0) {
      message += ` ${errorCount} failed.`;
    }
    resultsSummary.textContent = message;
    deleteSelectedBtn.textContent = "Delete selected (0)";
    deleteSelectedBtn.disabled = true;
  },

  /** Remove a record with the given URL from both allRecords and filteredRecords */
  removeRecordByUrl(url) {
    const allIdx = this.allRecords.findIndex((r) => r.url === url);
    if (allIdx !== -1) {
      this.allRecords.splice(allIdx, 1);
    }
    const filteredIdx = this.filteredRecords.findIndex((r) => r.url === url);
    if (filteredIdx !== -1) {
      this.filteredRecords.splice(filteredIdx, 1);
    }
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
      this.selectedUrls.clear();
      Pagination.reset();
      const selectAllCheckbox = document.getElementById("historySelectAll");
      const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
      const selectedCountSpan = document.getElementById("selectedCount");
      this.renderTablePage(
        document.getElementById("historyTableBody"),
        document.getElementById("historyPageInfo"),
        resultsSummary,
        selectAllCheckbox
      );
      this.updateSelectionUI(deleteSelectedBtn, selectedCountSpan);
    } catch (err) {
      resultsSummary.textContent = `Error: ${err.message}`;
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = "Refresh";
    }
  },

  renderTablePage(tableBody, pageInfo, resultsSummary, selectAllCheckbox) {
    const totalItems = this.filteredRecords.length;
    Pagination.setTotalItems(totalItems);
    const { startIdx, endIdx, totalPages } = Pagination.getSliceIndices(totalItems);
    const slice = this.filteredRecords.slice(startIdx, endIdx);

    // Update select-all checkbox state
    if (selectAllCheckbox) {
      const pageUrls = new Set(slice.map((r) => r.url));
      const allSelected = slice.length > 0 && slice.every((r) => this.selectedUrls.has(r.url));
      selectAllCheckbox.checked = allSelected;
    }

    // Update delete selected button
    const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
    const selectedCountSpan = document.getElementById("selectedCount");
    this.updateSelectionUI(deleteSelectedBtn, selectedCountSpan);

    tableBody.innerHTML = "";

    if (slice.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.textContent = "No history entries found.";
      td.style.textAlign = "center";
      td.style.color = "var(--muted)";
      tr.appendChild(td);
      tableBody.appendChild(tr);
    } else {
      slice.forEach((rec, idx) => {
        const tr = document.createElement("tr");
        if (this.selectedUrls.has(rec.url)) {
          tr.className = "selected";
        }

        // Checkbox cell
        const tdSelect = document.createElement("td");
        tdSelect.style.textAlign = "center";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = this.selectedUrls.has(rec.url);
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) {
            this.selectedUrls.add(rec.url);
          } else {
            this.selectedUrls.delete(rec.url);
          }
          this.updateSelectionUI(deleteSelectedBtn, selectedCountSpan);
          // Update select-all state
          if (selectAllCheckbox) {
            const allSelected = slice.every((r) => this.selectedUrls.has(r.url));
            selectAllCheckbox.checked = allSelected;
          }
        });
        tdSelect.appendChild(checkbox);

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

        // Delete button cell
        const tdActions = document.createElement("td");
        tdActions.style.textAlign = "center";
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn small danger";
        deleteBtn.textContent = "Delete";
        deleteBtn.style.padding = "4px 10px";
        deleteBtn.style.fontSize = "12px";
        deleteBtn.addEventListener("click", async () => {
          try {
            await HistoryAPI.deleteUrl(rec.url);
            this.selectedUrls.delete(rec.url);
            this.removeRecordByUrl(rec.url);
            this.updateSelectionUI(deleteSelectedBtn, selectedCountSpan);
            Pagination.reset();
            this.renderTablePage(
              document.getElementById("historyTableBody"),
              document.getElementById("historyPageInfo"),
              resultsSummary,
              selectAllCheckbox
            );
            resultsSummary.textContent = "Entry deleted.";
          } catch (err) {
            resultsSummary.textContent = `Error deleting: ${err.message}`;
          }
        });
        tdActions.appendChild(deleteBtn);

        tr.append(tdSelect, tdIndex, tdTitle, tdUrl, tdVisits, tdActions);
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
