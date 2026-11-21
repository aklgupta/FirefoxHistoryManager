// ============================================================
// App Entry Point
// ============================================================

// Theme management
const themeToggle = document.getElementById("themeToggle");
const toggleIcon = themeToggle.querySelector(".toggle-icon");
const toggleLabel = themeToggle.querySelector("span:last-child");

const applyTheme = (theme) => {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    toggleIcon.textContent = "☀️";
    toggleLabel.textContent = "Light Mode";
  } else {
    document.documentElement.removeAttribute("data-theme");
    toggleIcon.textContent = "🌙";
    toggleLabel.textContent = "Dark Mode";
  }
};

// Load saved theme on startup
browser.storage.local.get("theme").then((result) => {
  applyTheme(result.theme || "light");
});

// Toggle theme on click
themeToggle.addEventListener("click", () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(newTheme);
  browser.storage.local.set({ theme: newTheme });
});

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

// Sidebar collapse toggle
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const appLayout = document.querySelector(".app-layout");

sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  appLayout.classList.toggle("sidebar-collapsed");
});

// Initialize tabs
ViewHistoryTab.init();
MigrateUrlsTab.init();
AdvancedSearchTab.init();