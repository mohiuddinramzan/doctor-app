// =====================================================================
// কনফিগারেশন
// =====================================================================
const FEES = { newPatient: 1500, followUp: 800 };
const FOLLOWUP_VALID_DAYS = 60;     // এর বেশি দিন হলে আবার "নতুন রোগী"
const AVG_MINUTES_PER_PATIENT = 10; // সিরিয়াল সময় হিসাবের জন্য গড় সময়
const ADMIN_PIN = "1234";           // ডক্টর প্যানেলে ঢোকার ডেমো পিন — বদলে নিন
const TIME_SLOTS = ["বিকেল ৫:০০","বিকেল ৫:৩০","সন্ধ্যা ৬:০০","সন্ধ্যা ৬:৩০","সন্ধ্যা ৭:০০","রাত ৭:৩০","রাত ৮:০০"];
const STATUS = {
  PENDING: "অপেক্ষমাণ",
  CONFIRMED: "নিশ্চিত",
  COMPLETED: "সম্পন্ন",
  CANCELLED: "বাতিল",
  NOSHOW: "অনুপস্থিত",
};
const STATUS_LIST = [STATUS.PENDING, STATUS.CONFIRMED, STATUS.COMPLETED, STATUS.CANCELLED, STATUS.NOSHOW];

// ---------- পেজ পরিবর্তন (ন্যাভিগেশন) ----------
const pages = {
  home: document.getElementById("page-home"),
  booking: document.getElementById("page-booking"),
  list: document.getElementById("page-list"),
  admin: document.getElementById("page-admin"),
};
const navBtns = document.querySelectorAll(".nav-btn");

function goTo(pageName) {
  Object.values(pages).forEach(p => p.classList.add("hidden"));
  pages[pageName].classList.remove("hidden");

  navBtns.forEach(btn => btn.classList.remove("active"));
  const activeBtn = document.querySelector(`.nav-btn[data-goto="${pageName}"]`);
  if (activeBtn) activeBtn.classList.add("active");

  if (pageName === "list") renderAppointments();
  if (pageName === "admin") renderAdmin();
  window.scrollTo(0, 0);
}

document.querySelectorAll("[data-goto]").forEach(el => {
  el.addEventListener("click", () => goTo(el.dataset.goto));
});

// ---------- Google Sheet-এ ডেটা পাঠানোর সেটিংস ----------
const SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbz8hqEF1ynfNAznlVaVykOwelAGetTPbP8Y24PEyt4SQwO9z9eyykIO5KOebFAO6X1BHg/exec";

function sendToSheet(payload) {
  if (!SHEET_WEBHOOK_URL || SHEET_WEBHOOK_URL.includes("PASTE_YOUR")) {
    console.warn("Google Sheet URL সেট করা হয়নি — শুধু এই ফোনেই সেভ হচ্ছে।");
    return;
  }
  const body = new URLSearchParams(payload);
  fetch(SHEET_WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body,
  }).catch(err => console.warn("শিটে পাঠাতে সমস্যা হয়েছে:", err));
}

// =====================================================================
// ডেটা লেয়ার (localStorage)
// =====================================================================
const APPT_KEY = "doctorAppAppointments";
const PATIENT_KEY = "doctorAppPatients";
const PATIENT_SEQ_KEY = "doctorAppPatientSeq";

function getAppointments() {
  try { return JSON.parse(localStorage.getItem(APPT_KEY)) || []; }
  catch (e) { return []; }
}
function saveAppointments(list) {
  localStorage.setItem(APPT_KEY, JSON.stringify(list));
}

function getPatients() {
  try { return JSON.parse(localStorage.getItem(PATIENT_KEY)) || []; }
  catch (e) { return []; }
}
function savePatients(list) {
  localStorage.setItem(PATIENT_KEY, JSON.stringify(list));
}

function nextPatientId() {
  let seq = parseInt(localStorage.getItem(PATIENT_SEQ_KEY) || "0", 10) + 1;
  localStorage.setItem(PATIENT_SEQ_KEY, String(seq));
  return "PT-" + String(seq).padStart(4, "0");
}

// ফোন নম্বর দিয়ে রোগীর প্রোফাইল খুঁজে বের করা/তৈরি করা
function findOrCreatePatient({ name, phone, age, gender, blood }) {
  const patients = getPatients();
  let patient = patients.find(p => p.phone === phone);
  if (patient) {
    // সবশেষ তথ্য দিয়ে প্রোফাইল আপডেট
    patient.name = name;
    patient.age = age;
    patient.gender = gender;
    patient.blood = blood;
  } else {
    patient = {
      patientId: nextPatientId(),
      name, phone, age, gender, blood,
      createdAt: new Date().toISOString(),
    };
    patients.push(patient);
  }
  savePatients(patients);
  return patient;
}

// এই ফোন নম্বরের সবচেয়ে সাম্প্রতিক (বাতিল/অনুপস্থিত ছাড়া) ভিজিটের তারিখ
function getLastVisitDate(phone, beforeDate) {
  const list = getAppointments();
  const cutStatuses = [STATUS.CANCELLED, STATUS.NOSHOW];
  const past = list.filter(a =>
    a.phone === phone &&
    !cutStatuses.includes(a.status) &&
    a.date < beforeDate
  );
  if (past.length === 0) return null;
  past.sort((a, b) => (a.date < b.date ? 1 : -1));
  return past[0].date;
}

function daysBetween(d1, d2) {
  const a = new Date(d1 + "T00:00:00");
  const b = new Date(d2 + "T00:00:00");
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
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
function toBnNum(n) {
  const bnDigits = ["০","১","২","৩","৪","৫","৬","৭","৮","৯"];
  return String(n).split("").map(ch => bnDigits[ch] || ch).join("");
}
function statusBadgeClass(status) {
  switch (status) {
    case STATUS.CONFIRMED: return "badge--confirmed";
    case STATUS.COMPLETED: return "badge--completed";
    case STATUS.CANCELLED: return "badge--cancelled";
    case STATUS.NOSHOW: return "badge--noshow";
    default: return "badge--pending";
  }
}

// =====================================================================
// সিরিয়াল / অপেক্ষার সময় হিসাব (ফিচার ১)
// =====================================================================
function getQueueInfo(appt) {
  const list = getAppointments().filter(a =>
    a.date === appt.date &&
    a.chamber === appt.chamber &&
    a.status !== STATUS.CANCELLED &&
    a.status !== STATUS.NOSHOW
  );
  list.sort((a, b) => {
    const ai = TIME_SLOTS.indexOf(a.time), bi = TIME_SLOTS.indexOf(b.time);
    if (ai !== bi) return ai - bi;
    return (a.createdAt || "").localeCompare(b.createdAt || "");
  });
  const myIndex = list.findIndex(a => a.id === appt.id);
  const ahead = list.slice(0, myIndex).filter(a =>
    a.status === STATUS.PENDING || a.status === STATUS.CONFIRMED
  ).length;
  return { ahead, etaMinutes: ahead * AVG_MINUTES_PER_PATIENT };
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function renderQueueLine(appt) {
  if (appt.status === STATUS.COMPLETED) return `<p>✅ ভিজিট সম্পন্ন হয়েছে।</p>`;
  if (appt.status === STATUS.CANCELLED) return "";
  if (appt.status === STATUS.NOSHOW) return `<p>⚠️ আপনাকে চেম্বারে পাওয়া যায়নি (অনুপস্থিত)।</p>`;
  if (appt.date !== todayStr()) {
    return `<p class="muted">📆 সিরিয়াল সংক্রান্ত তথ্য অ্যাপয়েন্টমেন্টের দিন এখানে দেখা যাবে।</p>`;
  }
  const q = getQueueInfo(appt);
  if (q.ahead === 0) {
    return `<p class="queue-line">🔔 আপনার আগে কেউ নেই — শীঘ্রই ডাকা হবে।</p>`;
  }
  return `<p class="queue-line">🔔 আপনার আগে <b>${toBnNum(q.ahead)} জন</b> রোগী আছেন · আনুমানিক অপেক্ষার সময়: <b>${toBnNum(q.etaMinutes)} মিনিট</b></p>`;
}

// =====================================================================
// বিলিং সহায়ক ফাংশন (ফিচার ৫)
// =====================================================================
function computeNetFee(fee, discount) {
  const d = Math.max(0, Math.min(fee, discount || 0));
  return fee - d;
}

function renderBillingLine(appt) {
  const net = computeNetFee(appt.fee, appt.discount);
  return `
    <p>💰 ফি: ৳${toBnNum(appt.fee)}${appt.discount ? ` · ছাড়: ৳${toBnNum(appt.discount)}` : ""} · প্রদেয়: <b>৳${toBnNum(net)}</b></p>
    <p>${appt.paidStatus === "Paid" ? "✅ পরিশোধিত" : "🕗 অপরিশোধিত"} · মাধ্যম: ${appt.payment || "-"}${appt.trxId ? " (TrxID: " + appt.trxId + ")" : ""}</p>
  `;
}

// =====================================================================
// ইনভয়েস / রসিদ (ফিচার ৫)
// =====================================================================
const invoiceModal = document.getElementById("invoiceModal");
const invoiceContent = document.getElementById("invoiceContent");

function openInvoice(appt) {
  const net = computeNetFee(appt.fee, appt.discount);
  invoiceContent.innerHTML = `
    <h3 style="margin-top:0;">🧾 ইনভয়েস / রসিদ</h3>
    <p class="muted" style="margin:0 0 10px;">ডাঃ ফারহানা আহমেদ — কার্ডিওলজিস্ট</p>
    <hr>
    <p><b>অ্যাপয়েন্টমেন্ট আইডি:</b> ${appt.id}</p>
    <p><b>পেশেন্ট আইডি:</b> ${appt.patientId || "-"}</p>
    <p><b>নাম:</b> ${appt.name} (${appt.age || "-"} বছর, ${appt.gender || "-"})</p>
    <p><b>মোবাইল:</b> ${appt.phone}</p>
    <p><b>তারিখ/সময়:</b> ${formatDateBangla(appt.date)}, ${appt.time}</p>
    <p><b>চেম্বার:</b> ${appt.chamber}</p>
    <p><b>ধরন:</b> ${appt.type}</p>
    <hr>
    <p><b>কনসালটেশন ফি:</b> ৳${toBnNum(appt.fee)}</p>
    <p><b>ছাড়:</b> ৳${toBnNum(appt.discount || 0)}</p>
    <p><b>মোট প্রদেয়:</b> ৳${toBnNum(net)}</p>
    <p><b>পেমেন্ট মাধ্যম:</b> ${appt.payment || "-"} ${appt.trxId ? "(TrxID: " + appt.trxId + ")" : ""}</p>
    <p><b>অবস্থা:</b> ${appt.paidStatus === "Paid" ? "পরিশোধিত ✅" : "অপরিশোধিত 🕗"}</p>
    <hr>
    <p class="muted" style="font-size:12px;">এটি একটি স্বয়ংক্রিয়ভাবে তৈরি রসিদ।</p>
  `;
  invoiceModal.classList.remove("hidden");
}
document.getElementById("invoiceCloseBtn").addEventListener("click", () => {
  invoiceModal.classList.add("hidden");
});
document.getElementById("invoicePrintBtn").addEventListener("click", () => window.print());

// =====================================================================
// বুকিং ফর্ম — ইনপুট এলিমেন্ট
// =====================================================================
const PAYMENT_NUMBER = "017XXXXXXXX";
const MOBILE_BANKING_METHODS = ["bKash", "Nagad", "Rocket"];

const paymentInfo = document.getElementById("paymentInfo");
const payMethodLabel = document.getElementById("payMethodLabel");
const payNumberEl = document.getElementById("payNumber");
const trxIdInput = document.getElementById("f-trxid");
const copyBtn = document.getElementById("copyPayNumber");

payNumberEl.textContent = PAYMENT_NUMBER;

function updatePaymentInfo() {
  const checked = document.querySelector('input[name="f-payment"]:checked');
  if (!checked) return;
  const isMobileBanking = MOBILE_BANKING_METHODS.includes(checked.value);

  paymentInfo.classList.toggle("hidden", !isMobileBanking);
  payMethodLabel.textContent = checked.value;
  trxIdInput.required = isMobileBanking;
  if (!isMobileBanking) trxIdInput.value = "";
}
document.querySelectorAll('input[name="f-payment"]').forEach(radio => {
  radio.addEventListener("change", updatePaymentInfo);
});
updatePaymentInfo();

copyBtn.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(PAYMENT_NUMBER); } catch (e) {}
  copyBtn.textContent = "কপি হয়েছে ✓";
  copyBtn.classList.add("copied");
  setTimeout(() => {
    copyBtn.textContent = "কপি";
    copyBtn.classList.remove("copied");
  }, 1500);
});

// ---------- ফলো-আপ যাচাই + ডকুমেন্ট আপলোড (ফিচার ২) ----------
const docUploadSection = document.getElementById("docUploadSection");
const docInput = document.getElementById("f-doc");
const docFileNameEl = document.getElementById("docFileName");
const phoneInput = document.getElementById("f-phone");
const patientLookupNote = document.getElementById("patientLookupNote");
const feeSummaryAmount = document.getElementById("feeSummaryAmount");

// বর্তমান বুকিং-এর জন্য ফলো-আপ যোগ্যতা যাচাই করে চূড়ান্ত ধরন ও ফি ঠিক করে
function resolveBookingType() {
  const requestedType = document.querySelector('input[name="f-type"]:checked').value;
  const phone = phoneInput.value.trim();
  const bookingDate = document.getElementById("f-date").value || todayStr();

  if (requestedType === "নতুন রোগী" || !phone) {
    return { requestedType, finalType: "নতুন রোগী", fee: FEES.newPatient, overridden: false, lastVisit: null };
  }

  const lastVisit = getLastVisitDate(phone, bookingDate);
  if (!lastVisit) {
    return { requestedType, finalType: "নতুন রোগী", fee: FEES.newPatient, overridden: true, lastVisit: null };
  }
  const gap = daysBetween(lastVisit, bookingDate);
  if (gap > FOLLOWUP_VALID_DAYS) {
    return { requestedType, finalType: "নতুন রোগী", fee: FEES.newPatient, overridden: true, lastVisit, gap };
  }
  return { requestedType, finalType: "ফলো-আপ", fee: FEES.followUp, overridden: false, lastVisit, gap };
}

function refreshBookingTypeUI() {
  const resolved = resolveBookingType();
  const isFollowUpFinal = resolved.finalType === "ফলো-আপ";

  // ডকুমেন্ট আপলোড শুধু চূড়ান্তভাবে ফলো-আপ হলে বাধ্যতামূলক দেখাবে
  docUploadSection.classList.toggle("hidden", !isFollowUpFinal);
  docInput.required = isFollowUpFinal;
  if (!isFollowUpFinal) {
    docInput.value = "";
    docFileNameEl.textContent = "";
  }

  feeSummaryAmount.textContent = "৳" + toBnNum(resolved.fee);

  if (resolved.requestedType === "ফলো-আপ" && resolved.overridden) {
    if (resolved.lastVisit) {
      patientLookupNote.textContent =
        `⚠️ আপনার শেষ ভিজিট ছিল ${formatDateBangla(resolved.lastVisit)} (${toBnNum(resolved.gap)} দিন আগে) — ৬০ দিনের বেশি হওয়ায় এটি এখন "নতুন রোগী" (৳${toBnNum(FEES.newPatient)}) হিসেবে গণ্য হবে।`;
    } else {
      patientLookupNote.textContent =
        `ℹ️ এই নম্বরে আগের কোনো ভিজিটের রেকর্ড পাওয়া যায়নি, তাই এটি "নতুন রোগী" (৳${toBnNum(FEES.newPatient)}) হিসেবে গণ্য হবে।`;
    }
  } else if (resolved.finalType === "ফলো-আপ") {
    patientLookupNote.textContent =
      `✅ ফলো-আপ যোগ্য (শেষ ভিজিট: ${formatDateBangla(resolved.lastVisit)}, ${toBnNum(resolved.gap)} দিন আগে)। পূর্বের প্রেসক্রিপশন আপলোড করুন।`;
  } else {
    patientLookupNote.textContent = "";
  }
}

document.querySelectorAll('input[name="f-type"]').forEach(radio => {
  radio.addEventListener("change", refreshBookingTypeUI);
});
phoneInput.addEventListener("blur", refreshBookingTypeUI);
phoneInput.addEventListener("input", refreshBookingTypeUI);
document.getElementById("f-date").addEventListener("change", refreshBookingTypeUI);
refreshBookingTypeUI();

docInput.addEventListener("change", () => {
  const file = docInput.files[0];
  docFileNameEl.textContent = file ? `📎 ${file.name}` : "";
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------- বুকিং ফর্ম সাবমিট ----------
const bookingForm = document.getElementById("bookingForm");

bookingForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const resolved = resolveBookingType();
  const isFollowUpFinal = resolved.finalType === "ফলো-আপ";

  const paymentMethod = document.querySelector('input[name="f-payment"]:checked').value;
  const trxId = trxIdInput.value.trim();

  if (MOBILE_BANKING_METHODS.includes(paymentMethod) && !trxId) {
    trxIdInput.focus();
    alert("Send Money করার পর Transaction ID লিখুন।");
    return;
  }

  const docFile = docInput.files[0];
  if (isFollowUpFinal && !docFile) {
    docInput.focus();
    alert("ফলো-আপ রোগীর জন্য পূর্বের প্রেসক্রিপশন/রিপোর্ট আপলোড বাধ্যতামূলক।");
    return;
  }

  let docBase64 = "", docName = "", docMime = "";
  if (docFile) {
    if (docFile.size > 5 * 1024 * 1024) {
      alert("ডকুমেন্ট ৫ এমবি-র বেশি হতে পারবে না।");
      return;
    }
    docBase64 = await fileToBase64(docFile);
    docName = docFile.name;
    docMime = docFile.type;
  }

  const name = document.getElementById("f-name").value.trim();
  const phone = phoneInput.value.trim();
  const age = document.getElementById("f-age").value.trim();
  const gender = document.getElementById("f-gender").value;
  const blood = document.getElementById("f-blood").value;

  const patient = findOrCreatePatient({ name, phone, age, gender, blood });

  const apptId = generateApptId();
  const appt = {
    id: apptId,
    patientId: patient.patientId,
    name, phone, age, gender, blood,
    requestedType: resolved.requestedType,
    type: resolved.finalType,
    typeOverridden: resolved.overridden,
    chamber: document.getElementById("f-chamber").value,
    date: document.getElementById("f-date").value,
    time: document.getElementById("f-time").value,
    notes: document.getElementById("f-notes").value.trim(),
    payment: paymentMethod,
    trxId: trxId,
    fee: resolved.fee,
    discount: 0,
    paidStatus: "Unpaid",
    status: STATUS.PENDING,
    docName: docName,
    docMime: docMime,
    docBase64: docBase64, // ডেমো: লোকালি সংরক্ষিত থাকছে যাতে ডক্টর প্যানেল থেকে দেখা যায়
    createdAt: new Date().toISOString(),
  };

  const list = getAppointments();
  list.unshift(appt);
  saveAppointments(list);

  const sheetPayload = { ...appt };
  sendToSheet(sheetPayload);

  bookingForm.reset();
  updatePaymentInfo();
  refreshBookingTypeUI();
  docFileNameEl.textContent = "";

  document.getElementById("modalTitle").textContent = "অ্যাপয়েন্টমেন্ট সফল হয়েছে!";
  document.getElementById("modalMsg").textContent =
    resolved.overridden && resolved.requestedType === "ফলো-আপ"
      ? "নোট: ৬০ দিনের বেশি ব্যবধানের কারণে এটি 'নতুন রোগী' হিসেবে বুক হয়েছে। আপনার সিরিয়াল নম্বর"
      : "আপনার সিরিয়াল নম্বর";
  document.getElementById("modalApptId").textContent = apptId;
  document.getElementById("successModal").classList.remove("hidden");
});

document.getElementById("modalCloseBtn").addEventListener("click", () => {
  document.getElementById("successModal").classList.add("hidden");
  goTo("list");
});

// =====================================================================
// রোগীর নিজের অ্যাপয়েন্টমেন্ট তালিকা
// =====================================================================
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
        <span class="appt-item__id">${appt.id} · ${appt.patientId || "-"}</span>
        <span class="badge ${statusBadgeClass(appt.status)}">${appt.status}</span>
      </div>
      <h4>${appt.name}</h4>
      <p>📍 ${appt.chamber}</p>
      <p>📅 ${formatDateBangla(appt.date)} · 🕒 ${appt.time}</p>
      <p>${appt.type}${appt.typeOverridden ? " (স্বয়ংক্রিয়ভাবে পরিবর্তিত)" : ""}${appt.notes ? " — " + appt.notes : ""}</p>
      ${renderQueueLine(appt)}
      ${renderBillingLine(appt)}
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
        ${appt.status !== STATUS.CANCELLED && appt.status !== STATUS.COMPLETED
          ? `<button class="btn btn--danger" data-cancel="${appt.id}">বাতিল করুন</button>`
          : ""}
        <button class="btn" style="background:var(--mint-100); color:var(--teal-700);" data-invoice="${appt.id}">ইনভয়েস দেখুন</button>
      </div>
    </div>
  `).join("");

  wrap.querySelectorAll("[data-cancel]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.cancel;
      const updated = getAppointments().map(a =>
        a.id === id ? { ...a, status: STATUS.CANCELLED } : a
      );
      saveAppointments(updated);
      sendToSheet({ id: id, action: "cancel", status: STATUS.CANCELLED });
      renderAppointments();
    });
  });

  wrap.querySelectorAll("[data-invoice]").forEach(btn => {
    btn.addEventListener("click", () => {
      const appt = getAppointments().find(a => a.id === btn.dataset.invoice);
      if (appt) openInvoice(appt);
    });
  });
}

// =====================================================================
// ডক্টর প্যানেল (অ্যাডমিন) — স্ট্যাটাস ৪ ও বিলিং ৫
// =====================================================================
const adminLoginBox = document.getElementById("adminLoginBox");
const adminPanel = document.getElementById("adminPanel");
const adminPinInput = document.getElementById("adminPin");
const adminDateFilter = document.getElementById("adminDateFilter");

document.getElementById("adminLoginBtn").addEventListener("click", () => {
  if (adminPinInput.value === ADMIN_PIN) {
    sessionStorage.setItem("doctorAppAdminUnlocked", "1");
    renderAdmin();
  } else {
    alert("পিন সঠিক নয়।");
  }
});
document.getElementById("adminLogoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem("doctorAppAdminUnlocked");
  renderAdmin();
});
adminDateFilter.addEventListener("change", renderAdminList);

function isAdminUnlocked() {
  return sessionStorage.getItem("doctorAppAdminUnlocked") === "1";
}

function renderAdmin() {
  const unlocked = isAdminUnlocked();
  adminLoginBox.classList.toggle("hidden", unlocked);
  adminPanel.classList.toggle("hidden", !unlocked);
  if (unlocked) renderAdminList();
}

function renderAdminList() {
  const filterDate = adminDateFilter.value;
  let list = getAppointments();
  if (filterDate) list = list.filter(a => a.date === filterDate);
  list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const wrap = document.getElementById("adminApptList");
  const emptyMsg = document.getElementById("adminApptEmpty");

  if (list.length === 0) {
    wrap.innerHTML = "";
    emptyMsg.classList.remove("hidden");
    return;
  }
  emptyMsg.classList.add("hidden");

  wrap.innerHTML = list.map(appt => {
    const net = computeNetFee(appt.fee, appt.discount);
    const statusOptions = STATUS_LIST.map(s =>
      `<option value="${s}" ${appt.status === s ? "selected" : ""}>${s}</option>`
    ).join("");
    return `
    <div class="appt-item">
      <div class="appt-item__top">
        <span class="appt-item__id">${appt.id} · ${appt.patientId || "-"}</span>
        <span class="badge ${statusBadgeClass(appt.status)}">${appt.status}</span>
      </div>
      <h4>${appt.name} <span class="muted" style="font-weight:400;font-size:13px;">(${appt.age || "-"} বছর, ${appt.gender || "-"}, ${appt.blood || "-"})</span></h4>
      <p>📞 ${appt.phone}</p>
      <p>📍 ${appt.chamber} · 📅 ${formatDateBangla(appt.date)} · 🕒 ${appt.time}</p>
      <p>${appt.type}${appt.notes ? " — " + appt.notes : ""}</p>
      ${appt.docName ? `<p>📎 আপলোডকৃত ডকুমেন্ট: ${appt.docName} ${appt.docBase64 ? `<a href="data:${appt.docMime};base64,${appt.docBase64}" download="${appt.docName}">(ডাউনলোড)</a>` : ""}</p>` : ""}

      <label style="margin-top:10px;">স্ট্যাটাস</label>
      <select data-status="${appt.id}">${statusOptions}</select>

      <div class="choice-row" style="margin-top:10px;">
        <div style="flex:1">
          <label>ছাড় (৳)</label>
          <input type="number" min="0" max="${appt.fee}" value="${appt.discount || 0}" data-discount="${appt.id}">
        </div>
        <div style="flex:1">
          <label>পেমেন্ট অবস্থা</label>
          <select data-paid="${appt.id}">
            <option value="Unpaid" ${appt.paidStatus === "Unpaid" ? "selected" : ""}>অপরিশোধিত</option>
            <option value="Paid" ${appt.paidStatus === "Paid" ? "selected" : ""}>পরিশোধিত</option>
          </select>
        </div>
      </div>
      <p style="margin-top:8px;">প্রদেয়: <b>৳${toBnNum(net)}</b> · মাধ্যম: ${appt.payment || "-"}${appt.trxId ? " (TrxID: " + appt.trxId + ")" : ""}</p>

      <button class="btn" style="background:var(--mint-100); color:var(--teal-700); margin-top:10px;" data-invoice-admin="${appt.id}">ইনভয়েস/রসিদ</button>
    </div>
    `;
  }).join("");

  wrap.querySelectorAll("[data-status]").forEach(sel => {
    sel.addEventListener("change", () => {
      updateAppointment(sel.dataset.status, { status: sel.value });
    });
  });
  wrap.querySelectorAll("[data-discount]").forEach(inp => {
    inp.addEventListener("change", () => {
      let val = parseInt(inp.value, 10) || 0;
      updateAppointment(inp.dataset.discount, { discount: val });
    });
  });
  wrap.querySelectorAll("[data-paid]").forEach(sel => {
    sel.addEventListener("change", () => {
      updateAppointment(sel.dataset.paid, { paidStatus: sel.value });
    });
  });
  wrap.querySelectorAll("[data-invoice-admin]").forEach(btn => {
    btn.addEventListener("click", () => {
      const appt = getAppointments().find(a => a.id === btn.dataset.invoiceAdmin);
      if (appt) openInvoice(appt);
    });
  });
}

function updateAppointment(id, changes) {
  const list = getAppointments();
  const updated = list.map(a => (a.id === id ? { ...a, ...changes } : a));
  saveAppointments(updated);
  sendToSheet({ id, action: "update", ...changes });
  renderAdminList();
}

// ---------- শুরুতে আজকের তারিখ ন্যূনতম হিসেবে সেট করা ----------
const dateInput = document.getElementById("f-date");
const today = todayStr();
dateInput.min = today;
dateInput.value = today;
adminDateFilter.value = today;

// ---------- শুরুতে হোম পেজ দেখানো ----------
goTo("home");
