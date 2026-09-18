// ---------- পেজ পরিবর্তন (ন্যাভিগেশন) ----------
const pages = {
  home: document.getElementById("page-home"),
  booking: document.getElementById("page-booking"),
  list: document.getElementById("page-list"),
};
const navBtns = document.querySelectorAll(".nav-btn");

function goTo(pageName) {
  Object.values(pages).forEach(p => p.classList.add("hidden"));
  pages[pageName].classList.remove("hidden");

  navBtns.forEach(btn => btn.classList.remove("active"));
  const activeBtn = document.querySelector(`.nav-btn[data-goto="${pageName}"]`);
  if (activeBtn) activeBtn.classList.add("active");

  if (pageName === "list") renderAppointments();
  window.scrollTo(0, 0);
}

document.querySelectorAll("[data-goto]").forEach(el => {
  el.addEventListener("click", () => goTo(el.dataset.goto));
});

// ---------- Google Sheet-এ ডেটা পাঠানোর সেটিংস ----------
const SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzJM3KgeHIytowZfgJLhPgAzRBbVDYZ7c84MIUmyeVjWxH783RUlOlFAIvRdLRZFIQjJw/exec";

function sendToSheet(appt) {
  if (!SHEET_WEBHOOK_URL || SHEET_WEBHOOK_URL.includes("PASTE_YOUR")) {
    console.warn("Google Sheet URL সেট করা হয়নি — শুধু এই ফোনেই সেভ হচ্ছে।");
    return;
  }
  const body = new URLSearchParams(appt);
  fetch(SHEET_WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body,
  }).catch(err => console.warn("শিটে পাঠাতে সমস্যা হয়েছে:", err));
}

// ---------- অ্যাপয়েন্টমেন্ট সংরক্ষণ (localStorage) ----------
const STORAGE_KEY = "doctorAppAppointments";

function getAppointments() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveAppointments(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function generateApptId() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return "APT-" + num;
}

function formatDateBangla(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const bnDigits = ["০","১","২","৩","৪","৫","৬","৭","৮","৯"];
  const toBn = n => String(n).split("").map(ch => bnDigits[ch] || ch).join("");
  const months = ["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"];
  return `${toBn(d.getDate())} ${months[d.getMonth()]}, ${toBn(d.getFullYear())}`;
}

// ---------- বুকিং ফর্ম সাবমিট ----------
const bookingForm = document.getElementById("bookingForm");

bookingForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const appt = {
    id: generateApptId(),
    name: document.getElementById("f-name").value.trim(),
    phone: document.getElementById("f-phone").value.trim(),
    type: document.querySelector('input[name="f-type"]:checked').value,
    chamber: document.getElementById("f-chamber").value,
    date: document.getElementById("f-date").value,
    time: document.getElementById("f-time").value,
    notes: document.getElementById("f-notes").value.trim(),
    status: "নিশ্চিত",
  };

  const list = getAppointments();
  list.unshift(appt);
  saveAppointments(list);
  sendToSheet(appt);

  bookingForm.reset();

  document.getElementById("modalApptId").textContent = appt.id;
  document.getElementById("successModal").classList.remove("hidden");
});

document.getElementById("modalCloseBtn").addEventListener("click", () => {
  document.getElementById("successModal").classList.add("hidden");
  goTo("list");
});

// ---------- অ্যাপয়েন্টমেন্ট তালিকা দেখানো ----------
function renderAppointments() {
  const list = getAppointments();
  const wrap = document.getElementById("apptList");
  const emptyMsg = document.getElementById("apptEmpty");

  if (list.length === 0) {
    wrap.innerHTML = "";
    emptyMsg.classList.remove("hidden");
    return;
  }
  emptyMsg.classList.add("hidden");

  wrap.innerHTML = list.map(appt => `
    <div class="appt-item">
      <div class="appt-item__top">
        <span class="appt-item__id">${appt.id}</span>
        <span class="badge ${appt.status === "বাতিল" ? "badge--cancelled" : ""}">${appt.status}</span>
      </div>
      <h4>${appt.name}</h4>
      <p>📍 ${appt.chamber}</p>
      <p>📅 ${formatDateBangla(appt.date)} · 🕒 ${appt.time}</p>
      <p>${appt.type}${appt.notes ? " — " + appt.notes : ""}</p>
      ${appt.status !== "বাতিল"
        ? `<button class="btn btn--danger" data-cancel="${appt.id}">বাতিল করুন</button>`
        : ""}
    </div>
  `).join("");

  wrap.querySelectorAll("[data-cancel]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.cancel;
      const updated = getAppointments().map(a =>
        a.id === id ? { ...a, status: "বাতিল" } : a
      );
      saveAppointments(updated);
      sendToSheet({ id: id, action: "cancel" });
      renderAppointments();
    });
  });
}

// ---------- শুরুতে আজকের তারিখ ন্যূনতম হিসেবে সেট করা ----------
const dateInput = document.getElementById("f-date");
const today = new Date().toISOString().split("T")[0];
dateInput.min = today;
dateInput.value = today;

// ---------- শুরুতে হোম পেজ দেখানো ----------
goTo("home");
