// ============================================================
// App Entry Point
// ============================================================

// Tab Navigation
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

// Initialize tabs
ViewHistoryTab.init();
MigrateUrlsTab.init();