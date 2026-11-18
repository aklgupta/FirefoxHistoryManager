// ============================================================
// Common Pagination API
// ============================================================

/**
 * Shared pagination controller for table views.
 * Both tabs use nearly identical pagination logic, so this module
 * encapsulates page state, page-size changes, and button wiring.
 */
const Pagination = {
  currentPage: 1,
  pageSize: 50,

  /**
   * Initialize pagination for a given tab.
   * @param {HTMLElement} pageSizeSelect - the <select> for page size
   * @param {HTMLElement} firstBtn
   * @param {HTMLElement} prevBtn
   * @param {HTMLElement} nextBtn
   * @param {HTMLElement} lastBtn
   * @param {Function} onRender - callback invoked after every page change
   */
  init(pageSizeSelect, firstBtn, prevBtn, nextBtn, lastBtn, onRender) {
    this.pageSize = parseInt(pageSizeSelect.value, 10);
    this.currentPage = 1;
    this._onRender = onRender;
    this._firstBtn = firstBtn;
    this._prevBtn = prevBtn;
    this._nextBtn = nextBtn;
    this._lastBtn = lastBtn;

    pageSizeSelect.addEventListener("change", () => {
      this.pageSize = parseInt(pageSizeSelect.value, 10);
      this.currentPage = 1;
      this._onRender();
    });

    firstBtn.addEventListener("click", () => {
      this.currentPage = 1;
      this._onRender();
    });

    prevBtn.addEventListener("click", () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this._onRender();
      }
    });

    nextBtn.addEventListener("click", () => {
      const totalPages = Math.ceil(this._totalItems / this.pageSize);
      if (this.currentPage < totalPages) {
        this.currentPage++;
        this._onRender();
      }
    });

    lastBtn.addEventListener("click", () => {
      this.currentPage = Math.max(1, Math.ceil(this._totalItems / this.pageSize));
      this._onRender();
    });
  },

  /**
   * Update the total item count (set before render so next/last buttons work).
   */
  setTotalItems(count) {
    this._totalItems = count;
  },

  /**
   * Return the slice indices for the current page.
   */
  getSliceIndices(totalItems) {
    const totalPages = Math.max(1, Math.ceil(totalItems / this.pageSize));
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const startIdx = (this.currentPage - 1) * this.pageSize;
    const endIdx = Math.min(startIdx + this.pageSize, totalItems);
    return { startIdx, endIdx, totalPages };
  },

  /**
   * Update pagination button disabled states and page info text.
   */
  updateControls(totalItems, pageInfoEl) {
    const totalPages = Math.max(1, Math.ceil(totalItems / this.pageSize));
    this._firstBtn.disabled = this.currentPage <= 1;
    this._prevBtn.disabled = this.currentPage <= 1;
    this._nextBtn.disabled = this.currentPage >= totalPages;
    this._lastBtn.disabled = this.currentPage >= totalPages;
  },

  /**
   * Reset to first page (e.g., after a filter change).
   */
  reset() {
    this.currentPage = 1;
  }
};
