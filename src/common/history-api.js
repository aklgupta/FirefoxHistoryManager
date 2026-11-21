// ============================================================
// Common Browser History API
// ============================================================

/**
 * Shared wrapper around the browser.history WebExtension API.
 */
const HistoryAPI = {
  /**
   * Fetch history records filtered by time range.
   * @param {number} startTime - epoch ms (0 for all time)
   * @param {number} maxResults - max records to fetch
   * @returns {Promise<Array>} array of { title, url, visitCount }
   */
  async search(startTime = 0, maxResults = 100000) {
    const results = await browser.history.search({
      text: "",
      maxResults,
      startTime
    });
    return results.map((item) => ({
      title: item.title || "",
      url: item.url,
      visitCount: item.visitCount || 1
    }));
  },

  /**
   * Search history by a specific text query (used by migration).
   * @param {string} text - search query (e.g., a domain)
   * @param {number} startTime
   * @param {number} maxResults
   * @returns {Promise<Array>} raw browser history results
   */
  async searchByText(text, startTime = 0, maxResults = 100000) {
    return browser.history.search({ text, startTime, maxResults });
  },

  /**
   * Get visit records for a specific URL.
   * @param {string} url
   * @returns {Promise<Array>}
   */
  async getVisits(url) {
    return browser.history.getVisits({ url });
  },

  /**
   * Add a visit to history.
   * @param {string} url
   * @param {string} [title]
   * @param {string} [transition]
   * @param {number} [visitTime]
   */
  async addUrl(url, title, transition, visitTime) {
    const opts = { url };
    if (title) opts.title = title;
    if (transition) opts.transition = transition;
    if (visitTime) opts.visitTime = visitTime;
    return browser.history.addUrl(opts);
  },

  /**
   * Delete a URL from history.
   * @param {string} url
   */
  async deleteUrl(url) {
    return browser.history.deleteUrl({ url });
  },

  /**
   * Filter records to only include http/https URLs.
   * @param {Array} records
   * @returns {Array}
   */
  filterHttpHttps(records) {
    return records.filter((r) => {
      try {
        const parsed = new URL(r.url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    });
  },

  /**
   * Fetch visits for multiple URLs concurrently.
   * @param {string[]} urls - array of URLs
   * @returns {Promise<Map<string, Array>>} map from URL to its visit records
   */
  async getVisitsBatch(urls) {
    const results = new Map();
    const promises = urls.map(async (url) => {
      try {
        const visits = await browser.history.getVisits({ url });
        results.set(url, visits);
      } catch {
        results.set(url, []);
      }
    });
    await Promise.all(promises);
    return results;
  }
};
