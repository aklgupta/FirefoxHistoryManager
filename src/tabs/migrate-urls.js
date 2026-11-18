// ============================================================
// Migrate URLs Tab
// ============================================================

const MigrateUrlsTab = {
  allMatchedRecords: [],
  filteredRecords: [],

  init() {
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

    // Initialize shared pagination
    Pagination.init(pageSizeSelect, firstPageBtn, prevPageBtn, nextPageBtn, lastPageBtn, () => {
      this.renderTablePage(previewTableBody, pageInfo, resultsSummary);
    });

    // Debounced filter for preview results
    Filtering.createDebouncedFilter(
      filterInput,
      () => this.allMatchedRecords,
      (record, query) => Filtering.matchFields(record, query, ["oldUrl", "newUrl", "title"]),
      (filtered) => {
        this.filteredRecords = filtered;
        Pagination.reset();
        this.renderTablePage(previewTableBody, pageInfo, resultsSummary);
      },
      300
    );

    // Preview button
    previewBtn.addEventListener("click", async () => {
      const result = validateInputs(oldDomainInput, newDomainInput);
      if (result.error) {
        setStatus(statusBar, result.error, "error");
        return;
      }

      const { oldDomain, newDomain } = result;
      const includeSubdomains = includeSubdomainsInput.checked;

      previewBtn.disabled = true;
      setStatus(statusBar, "Searching Firefox history...");

      try {
        const matched = await findMatchingRecords(oldDomain, newDomain, includeSubdomains);

        if (matched.length === 0) {
          resultsSection.classList.add("hidden");
          setStatus(statusBar, `No history entries found for ${oldDomain}.`, "info");
          return;
        }

        this.allMatchedRecords = matched;
        filterInput.value = "";
        this.filteredRecords = [...this.allMatchedRecords];
        Pagination.reset();
        resultsSection.classList.remove("hidden");
        this.renderTablePage(previewTableBody, pageInfo, resultsSummary);
        setStatus(statusBar, `Preview ready: ${matched.length} unique URL(s) found.`, "success");
      } catch (err) {
        setStatus(statusBar, `Error: ${err.message}`, "error");
      } finally {
        previewBtn.disabled = false;
      }
    });

    // Migrate button
    migrateBtn.addEventListener("click", async () => {
      const result = validateInputs(oldDomainInput, newDomainInput);
      if (result.error) {
        setStatus(statusBar, result.error, "error");
        return;
      }

      const { oldDomain, newDomain } = result;
      const includeSubdomains = includeSubdomainsInput.checked;
      const deleteOld = deleteOldInput.checked;

      previewBtn.disabled = true;
      migrateBtn.disabled = true;
      setStatus(statusBar, "Scanning history for migration...");

      try {
        const records = await findMatchingRecords(oldDomain, newDomain, includeSubdomains);

        if (records.length === 0) {
          setStatus(statusBar, `No history entries found for ${oldDomain}.`, "info");
          return;
        }

        let migratedUrls = 0;
        let migratedVisits = 0;

        for (const rec of records) {
          const visits = await HistoryAPI.getVisits(rec.oldUrl);
          if (!visits || visits.length === 0) continue;

          let addedForThisUrl = 0;
          for (const visit of visits) {
            try {
              await HistoryAPI.addUrl(
                rec.newUrl,
                rec.title !== "(No title)" ? rec.title : undefined,
                visit.transition || "link",
                visit.visitTime
              );
            } catch {
              await HistoryAPI.addUrl(
                rec.newUrl,
                rec.title !== "(No title)" ? rec.title : undefined,
                "link",
                visit.visitTime
              );
            }
            addedForThisUrl++;
            migratedVisits++;
          }

          if (deleteOld && addedForThisUrl === visits.length) {
            await HistoryAPI.deleteUrl(rec.oldUrl);
          }

          migratedUrls++;
          if (migratedUrls % 10 === 0 || migratedUrls === records.length) {
            setStatus(statusBar, `Migrating... (${migratedUrls} / ${records.length} URLs)`);
          }
        }

        setStatus(
          statusBar,
          `Migration complete! Copied ${migratedVisits} visit(s) across ${migratedUrls} URL(s) to ${newDomain}.`,
          "success"
        );
      } catch (err) {
        setStatus(statusBar, `Error during migration: ${err.message}`, "error");
      } finally {
        previewBtn.disabled = false;
        migrateBtn.disabled = false;
      }
    });
  },

  renderTablePage(previewTableBody, pageInfo, resultsSummary) {
    const totalItems = this.filteredRecords.length;
    Pagination.setTotalItems(totalItems);
    const { startIdx, endIdx, totalPages } = Pagination.getSliceIndices(totalItems);
    const slice = this.filteredRecords.slice(startIdx, endIdx);

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

    const totalVisits = this.filteredRecords.reduce((sum, r) => sum + r.visitCount, 0);
    resultsSummary.textContent =
      this.filteredRecords.length === this.allMatchedRecords.length
        ? `Showing ${this.allMatchedRecords.length} unique URL(s) (~${totalVisits} total visits)`
        : `Filtered: ${this.filteredRecords.length} of ${this.allMatchedRecords.length} URL(s)`;

    pageInfo.textContent =
      totalItems > 0
        ? `Rows ${startIdx + 1}–${endIdx} of ${totalItems} (Page ${Pagination.currentPage} of ${totalPages})`
        : "0 rows";

    Pagination.updateControls(totalItems, pageInfo);
  }
};

// ---- Migrate-specific helper functions ----

function setStatus(statusBar, message, type = "info") {
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

function validateInputs(oldDomainInput, newDomainInput) {
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
  const results = await HistoryAPI.searchByText(oldDomain);

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
