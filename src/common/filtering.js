// ============================================================
// Common Filtering API
// ============================================================

/**
 * Shared filtering utilities for debounced, client-side text filtering.
 */
const Filtering = {
  /**
   * Create a debounced filter handler.
   * @param {HTMLElement} inputEl - the text input element
   * @param {Function} getAllRecords - getter function that returns the current full dataset
   * @param {Function} matchFn - (record, query) => boolean
   * @param {Function} onFilter - callback invoked with filtered array after each change
   * @param {number} delay - debounce delay in ms (default 300)
   * @returns {Function} cancel - call to clear the debounce timer
   */
  createDebouncedFilter(inputEl, getAllRecords, matchFn, onFilter, delay = 300) {
    let timer = null;

    const applyFilter = () => {
      const query = inputEl.value.trim().toLowerCase();
      const records = getAllRecords();
      let filtered;
      if (!query) {
        filtered = [...records];
      } else {
        filtered = records.filter((r) => matchFn(r, query));
      }
      onFilter(filtered);
    };

    inputEl.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(applyFilter, delay);
    });

    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        clearTimeout(timer);
        applyFilter();
      }
    });

    return () => clearTimeout(timer);
  },

  /**
   * Simple text match across multiple record fields.
   * @param {Object} record - the record object
   * @param {string} query - lowercase search query
   * @param {string[]} fields - field names to check
   * @returns {boolean}
   */
  matchFields(record, query, fields) {
    return fields.some((field) => {
      const value = record[field];
      return value && value.toString().toLowerCase().includes(query);
    });
  }
};
