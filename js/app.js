/**
 * app.js
 * ------------------------------------------------------------------
 * Shared across every page: navigation highlighting, toast system,
 * contact action builders (call/whatsapp/email/maps), the
 * notification bell, and the FAQ accordion. Loaded after
 * config.js + data.js on every page.
 * ------------------------------------------------------------------
 */

document.addEventListener("DOMContentLoaded", () => {
  seedDemoData();
  markActiveNavLink();
  wireContactButtons();
  renderNotificationBell();
  wireFaqAccordion();
  wireMobileNav();
});

/* ---------------- Toast notifications ---------------- */
function toast(message, type = "info", duration = 3200) {
  let host = document.getElementById("toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    host.className = "toast-host";
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.textContent = message;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("toast--show"));
  setTimeout(() => {
    el.classList.remove("toast--show");
    setTimeout(() => el.remove(), 250);
  }, duration);
}

/* ---------------- Confirmation dialog (native, wrapped for consistency) ---------------- */
function confirmAction(message) {
  return window.confirm(message);
}

/* ---------------- Nav highlighting ---------------- */
function markActiveNavLink() {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav-link]").forEach(link => {
    const href = link.getAttribute("href");
    if (href === path) link.classList.add("is-active");
  });
}

function wireMobileNav() {
  document.querySelectorAll("[data-nav-link]").forEach(link => {
    link.addEventListener("click", () => {
      document.querySelectorAll("[data-nav-link]").forEach(l => l.classList.remove("is-active"));
      link.classList.add("is-active");
    });
  });
}

/* ---------------- Contact buttons (real actions, driven by config) ---------------- */
function wireContactButtons() {
  document.querySelectorAll("[data-action='call']").forEach(btn => {
    btn.setAttribute("href", `tel:${DOCTOR_CONFIG.phone}`);
  });
  document.querySelectorAll("[data-action='whatsapp']").forEach(btn => {
    const msg = encodeURIComponent("Hello, I would like to know more about appointments.");
    btn.setAttribute("href", `https://wa.me/${DOCTOR_CONFIG.whatsapp}?text=${msg}`);
    btn.setAttribute("target", "_blank");
    btn.setAttribute("rel", "noopener");
  });
  document.querySelectorAll("[data-action='email']").forEach(btn => {
    btn.setAttribute("href", `mailto:${DOCTOR_CONFIG.email}?subject=${encodeURIComponent("Appointment Inquiry")}`);
  });
  document.querySelectorAll("[data-action='facebook']").forEach(btn => {
    btn.setAttribute("href", DOCTOR_CONFIG.facebook);
    btn.setAttribute("target", "_blank");
    btn.setAttribute("rel", "noopener");
  });
  document.querySelectorAll("[data-action='youtube']").forEach(btn => {
    btn.setAttribute("href", DOCTOR_CONFIG.youtube);
    btn.setAttribute("target", "_blank");
    btn.setAttribute("rel", "noopener");
  });
  document.querySelectorAll("[data-action='website']").forEach(btn => {
    btn.setAttribute("href", DOCTOR_CONFIG.website);
    btn.setAttribute("target", "_blank");
    btn.setAttribute("rel", "noopener");
  });
  document.querySelectorAll("[data-action='maps']").forEach(btn => {
    const chamberId = btn.getAttribute("data-chamber") || DOCTOR_CONFIG.chambers[0].id;
    const chamber = DOCTOR_CONFIG.chambers.find(c => c.id === chamberId) || DOCTOR_CONFIG.chambers[0];
    btn.setAttribute("href", chamber.mapsUrl);
    btn.setAttribute("target", "_blank");
    btn.setAttribute("rel", "noopener");
  });
}

/* ---------------- Notification bell (shared component) ---------------- */
function renderNotificationBell() {
  const host = document.getElementById("notif-bell");
  if (!host) return;
  const notifications = DB.getNotifications();
  const unread = notifications.filter(n => !n.read).length;

  host.innerHTML = `
    <button class="icon-btn notif-toggle" id="notifToggle" aria-haspopup="true" aria-expanded="false" aria-label="Notifications">
      🔔${unread > 0 ? `<span class="notif-dot">${unread}</span>` : ""}
    </button>
    <div class="notif-panel" id="notifPanel" hidden>
      <div class="notif-panel__head">
        <strong>Notifications</strong>
        <button class="link-btn" id="notifMarkRead">Mark all read</button>
      </div>
      <div class="notif-list">
        ${notifications.length ? notifications.map(n => `
          <div class="notif-item ${n.read ? "" : "notif-item--unread"}">
            <div class="notif-item__title">${escapeHtml(n.title)}</div>
            <div class="notif-item__body">${escapeHtml(n.body)}</div>
          </div>`).join("") : `<div class="empty-state empty-state--sm">No notifications yet.</div>`}
      </div>
    </div>
  `;

  const toggle = document.getElementById("notifToggle");
  const panel = document.getElementById("notifPanel");
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = panel.hasAttribute("hidden");
    if (isHidden) { panel.removeAttribute("hidden"); toggle.setAttribute("aria-expanded", "true"); }
    else { panel.setAttribute("hidden", ""); toggle.setAttribute("aria-expanded", "false"); }
  });
  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && e.target !== toggle) panel.setAttribute("hidden", "");
  });
  document.getElementById("notifMarkRead").addEventListener("click", () => {
    DB.markAllRead();
    renderNotificationBell();
  });
}

function pushNotification(title, body) {
  DB.addNotification({ id: genId("NTF"), title, body, read: false, createdAt: new Date().toISOString(), isDemo: false });
  renderNotificationBell();
}

/* ---------------- FAQ accordion ---------------- */
function wireFaqAccordion() {
  document.querySelectorAll(".faq-item").forEach(item => {
    const question = item.querySelector(".faq-item__q");
    if (!question) return;
    question.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");
      item.closest(".faq-list").querySelectorAll(".faq-item").forEach(i => i.classList.remove("is-open"));
      if (!isOpen) item.classList.add("is-open");
    });
  });
}

/* ---------------- Small utilities ---------------- */
function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (s) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]));
}

function formatCurrency(n) {
  return `${APP_SETTINGS.currency}${Number(n).toLocaleString()}`;
}

function formatDateHuman(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

/* Shared slot generator: turns "5:00 PM".."9:00 PM" + interval into a slot list */
function generateTimeSlots(startTime, endTime, slotMinutes) {
  const toMinutes = (t) => {
    const [time, meridian] = t.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (meridian === "PM" && h !== 12) h += 12;
    if (meridian === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };
  const toLabel = (mins) => {
    let h = Math.floor(mins / 60), m = mins % 60;
    const meridian = h >= 12 ? "PM" : "AM";
    let h12 = h % 12; if (h12 === 0) h12 = 12;
    return `${h12}:${String(m).padStart(2, "0")} ${meridian}`;
  };
  const start = toMinutes(startTime), end = toMinutes(endTime);
  const slots = [];
  for (let t = start; t < end; t += slotMinutes) slots.push(toLabel(t));
  return slots;
}
