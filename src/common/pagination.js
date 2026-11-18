// ============================================================
// Common Pagination API
// ============================================================

/**
 * Shared pagination controller for multiple table views.
 * Each tab registers with a unique key so pagination state and
 * button references are kept separate per tab.
 */
const Pagination = {
  /** @type {Map<string, object>} Per-tab pagination state */
  _tabs: new Map(),

  /** @type {string|null} Active tab key (set automatically on init) */
  _active: null,

  /**
   * Initialize pagination for a given tab.
   * @param {string} key - unique tab identifier (e.g. "view-history", "migrate-urls")
   * @param {HTMLElement} pageSizeSelect
   * @param {HTMLElement} firstBtn
   * @param {HTMLElement} prevBtn
   * @param {HTMLElement} nextBtn
   * @param {HTMLElement} lastBtn
   * @param {Function} onRender - callback invoked after every page change
   */
  init(key, pageSizeSelect, firstBtn, prevBtn, nextBtn, lastBtn, onRender) {
    const state = {
      currentPage: 1,
      pageSize: parseInt(pageSizeSelect.value, 10),
      _totalItems: 0,
      _onRender: onRender,
      _firstBtn: firstBtn,
      _prevBtn: prevBtn,
      _nextBtn: nextBtn,
      _lastBtn: lastBtn,
    };
    this._tabs.set(key, state);
    this._active = key;

    pageSizeSelect.addEventListener("change", () => {
      const s = this._tabs.get(key);
      s.pageSize = parseInt(pageSizeSelect.value, 10);
      s.currentPage = 1;
      this._active = key;
      s._onRender();
    });

    firstBtn.addEventListener("click", () => {
      this._active = key;
      const s = this._tabs.get(key);
      s.currentPage = 1;
      s._onRender();
    });

    prevBtn.addEventListener("click", () => {
      this._active = key;
      const s = this._tabs.get(key);
      if (s.currentPage > 1) {
        s.currentPage--;
        s._onRender();
      }
    });

    nextBtn.addEventListener("click", () => {
      this._active = key;
      const s = this._tabs.get(key);
      const totalItems = s._totalItems || 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / s.pageSize));
      if (s.currentPage < totalPages) {
        s.currentPage++;
        s._onRender();
      }
    });

    lastBtn.addEventListener("click", () => {
      this._active = key;
      const s = this._tabs.get(key);
      const totalItems = s._totalItems || 0;
      s.currentPage = Math.max(1, Math.ceil(totalItems / s.pageSize));
      s._onRender();
    });
  },

  /**
   * Set the active tab key (called at the start of renderTablePage).
   */
  setActive(key) {
    this._active = key;
  },

  /**
   * Update the total item count for the active tab.
   */
  setTotalItems(count) {
    const s = this._tabs.get(this._active);
    if (s) s._totalItems = count;
  },

  /**
   * Return the slice indices for the active tab's current page.
   */
  getSliceIndices(totalItems) {
    const s = this._tabs.get(this._active);
    if (!s) return { startIdx: 0, endIdx: 0, totalPages: 1 };
    const totalPages = Math.max(1, Math.ceil(totalItems / s.pageSize));
    if (s.currentPage > totalPages) s.currentPage = totalPages;
    const startIdx = (s.currentPage - 1) * s.pageSize;
    const endIdx = Math.min(startIdx + s.pageSize, totalItems);
    return { startIdx, endIdx, totalPages };
  },

  /**
   * Update pagination button disabled states for the active tab.
   */
  updateControls(totalItems, pageInfoEl) {
    const s = this._tabs.get(this._active);
    if (!s) return;
    const totalPages = Math.max(1, Math.ceil(totalItems / s.pageSize));
    s._firstBtn.disabled = s.currentPage <= 1;
    s._prevBtn.disabled = s.currentPage <= 1;
    s._nextBtn.disabled = s.currentPage >= totalPages;
    s._lastBtn.disabled = s.currentPage >= totalPages;
  },

  /**
   * Reset the active tab to first page.
   */
  reset() {
    const s = this._tabs.get(this._active);
    if (s) s.currentPage = 1;
  },

  // -- Convenience accessors used by tab code --

  /** Current page of the active tab */
  get currentPage() {
    const s = this._tabs.get(this._active);
    return s ? s.currentPage : 1;
  },

  /** Page size of the active tab */
  get pageSize() {
    const s = this._tabs.get(this._active);
    return s ? s.pageSize : 50;
  },

  /** Set page size on the active tab */
  set pageSize(val) {
    const s = this._tabs.get(this._active);
    if (s) s.pageSize = val;
  }
};
