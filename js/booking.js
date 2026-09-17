/**
 * booking.js — the 8-step appointment booking flow (booking.html)
 */

const bookingState = {
  patientType: null,       // "new" | "existing"
  existingPatient: null,   // patient record if found
  chamberId: null,
  dateISO: null,
  time: null,
  serial: null,
  form: {},
  files: [],
  fee: 0,
  paymentMethod: null,
  transaction: null,
  appointment: null
};

const STEP_LABELS = ["Patient", "Chamber", "Date", "Time", "Details", "Fee", "Payment", "Done"];
let currentStep = 1;

document.addEventListener("DOMContentLoaded", () => {
  renderStepper();
  wireStep1();
  wireStep2();
  wireStep4Placeholder();
  wireStep5();
  wireStep6();
  wireStep7();
  wireStep8();
  wireBackButtons();
});

/* ---------------- Stepper UI ---------------- */
function renderStepper() {
  document.getElementById("stepper").innerHTML = STEP_LABELS.map((label, i) => {
    const n = i + 1;
    const cls = n < currentStep ? "is-done" : n === currentStep ? "is-active" : "";
    return `<div class="stepper__step ${cls}" data-step-indicator="${n}">
        <div class="stepper__circle">${n < currentStep ? "✓" : n}</div>
        <div class="stepper__label">${label}</div>
      </div>${n < STEP_LABELS.length ? '<div class="stepper__line"></div>' : ""}`;
  }).join("");
}

function goToStep(n) {
  currentStep = n;
  document.querySelectorAll(".booking-step").forEach(s => s.classList.toggle("is-active", Number(s.dataset.step) === n));
  renderStepper();
  window.scrollTo({ top: 0, behavior: "smooth" });
  updateStickyBar();
}

function wireBackButtons() {
  document.querySelectorAll("[data-back]").forEach(btn => {
    btn.addEventListener("click", () => goToStep(Math.max(1, currentStep - 1)));
  });
}

function updateStickyBar() {
  const bar = document.getElementById("stickyBar");
  if (currentStep >= 5 && currentStep <= 6) {
    bar.hidden = false;
    document.getElementById("stickyFee").textContent = formatCurrency(bookingState.fee || 0);
  } else {
    bar.hidden = true;
  }
}

/* ================= STEP 1: Patient type ================= */
function wireStep1() {
  document.querySelectorAll('.radio-card[data-type]').forEach(card => {
    card.addEventListener("click", () => {
      document.querySelectorAll('.radio-card[data-type]').forEach(c => c.classList.remove("is-selected"));
      card.classList.add("is-selected");
      card.querySelector("input").checked = true;
      bookingState.patientType = card.dataset.type;
      document.getElementById("existingLookup").hidden = bookingState.patientType !== "existing";
      document.getElementById("step1Next").disabled = bookingState.patientType === "existing" ? !bookingState.existingPatient : false;
    });
  });

  document.getElementById("lookupBtn").addEventListener("click", () => {
    const query = document.getElementById("lookupPhone").value.trim();
    const patient = DB.findPatientByPhone(query);
    const resultEl = document.getElementById("lookupResult");
    if (patient) {
      bookingState.existingPatient = patient;
      resultEl.innerHTML = `<div class="card" style="background:var(--color-success-bg);border:none;">✅ Found: <strong>${escapeHtml(patient.name)}</strong>, ${patient.age} yrs, ${patient.gender}</div>`;
      document.getElementById("step1Next").disabled = false;
      toast("Patient record found.", "success");
    } else {
      resultEl.innerHTML = `<div class="card" style="background:var(--color-error-bg);border:none;">No record found. You can continue and we'll create a new profile.</div>`;
      bookingState.existingPatient = null;
      document.getElementById("step1Next").disabled = false;
    }
  });

  document.getElementById("step1Next").addEventListener("click", () => {
    if (bookingState.existingPatient) prefillFromPatient(bookingState.existingPatient);
    goToStep(2);
  });
}

function prefillFromPatient(p) {
  bookingState.form = { fullName: p.name, gender: p.gender, age: p.age, phone: p.phone, whatsapp: p.whatsapp, address: p.address };
}

/* ================= STEP 2: Chamber ================= */
function wireStep2() {
  document.getElementById("chamberChoices").innerHTML = DOCTOR_CONFIG.chambers.map(c => `
    <label class="radio-card" data-chamber-choice="${c.id}">
      <input type="radio" name="chamberChoice" value="${c.id}">
      <div class="radio-card__title">${c.name}</div>
      <div class="radio-card__sub">${c.address}</div>
      <div class="radio-card__sub">${c.visitingDays.join(", ")} · ${c.visitingHours}</div>
    </label>`).join("");

  document.querySelectorAll('[data-chamber-choice]').forEach(card => {
    card.addEventListener("click", () => {
      document.querySelectorAll('[data-chamber-choice]').forEach(c => c.classList.remove("is-selected"));
      card.classList.add("is-selected");
      card.querySelector("input").checked = true;
      bookingState.chamberId = card.dataset.chamberChoice;
      document.getElementById("step2Next").disabled = false;
    });
  });

  document.getElementById("step2Next").addEventListener("click", () => {
    renderCalendar();
    goToStep(3);
  });
}

/* ================= STEP 3: Date (calendar) ================= */
function renderCalendar(monthOffset = 0) {
  const schedule = DB.getSchedule()[bookingState.chamberId];
  const dowNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const fullDowNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const today = new Date();
  const view = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = view.getFullYear(), month = view.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = view.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  let cells = `<div class="calendar__head">
      <button class="icon-btn" id="calPrev" aria-label="Previous month">‹</button>
      <strong>${monthName}</strong>
      <button class="icon-btn" id="calNext" aria-label="Next month">›</button>
    </div><div class="calendar__grid">`;
  cells += dowNames.map(d => `<div class="calendar__dow">${d}</div>`).join("");
  for (let i = 0; i < firstDow; i++) cells += `<div class="calendar__day calendar__day--empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const iso = dateObj.toISOString().slice(0, 10);
    const dow = fullDowNames[dateObj.getDay()];
    const isPast = dateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isOpenDay = schedule.visitingDays.includes(dow);
    const isHoliday = schedule.holidays.includes(iso);
    const available = isOpenDay && !isPast && !isHoliday;
    cells += `<div class="calendar__day ${available ? "calendar__day--available" : "calendar__day--disabled"}" data-date="${iso}" ${available ? "" : "aria-disabled='true'"}>${d}</div>`;
  }
  cells += `</div>`;
  document.getElementById("calendar").innerHTML = cells;

  document.getElementById("calPrev").addEventListener("click", () => renderCalendar(monthOffset - 1));
  document.getElementById("calNext").addEventListener("click", () => renderCalendar(monthOffset + 1));

  document.querySelectorAll(".calendar__day--available").forEach(day => {
    day.addEventListener("click", () => {
      document.querySelectorAll(".calendar__day").forEach(d => d.classList.remove("calendar__day--selected"));
      day.classList.add("calendar__day--selected");
      bookingState.dateISO = day.dataset.date;
      document.getElementById("step3Next").disabled = false;
    });
  });
}

document.getElementById("step3Next")?.addEventListener("click", () => {
  renderSlots();
  goToStep(4);
});

/* ================= STEP 4: Time / serial ================= */
function wireStep4Placeholder() { /* slot rendering happens on demand, see renderSlots() */ }

function renderSlots() {
  const schedule = DB.getSchedule()[bookingState.chamberId];
  const chamber = DOCTOR_CONFIG.chambers.find(c => c.id === bookingState.chamberId);
  const existing = DB.getAppointmentsForDate(bookingState.dateISO, bookingState.chamberId)
    .filter(a => a.status !== "Cancelled");

  document.getElementById("slotSummary").textContent =
    `${chamber.name} · ${formatDateHuman(bookingState.dateISO)} · ${existing.length}/${schedule.maxPatientsPerDay} booked`;

  const slots = generateTimeSlots(schedule.startTime, schedule.endTime, schedule.slotMinutes);
  const grid = document.getElementById("slotGrid");

  if (existing.length >= schedule.maxPatientsPerDay) {
    grid.innerHTML = `<div class="empty-state empty-state--sm" style="grid-column:1/-1;">Fully booked for this date. Please choose another date.</div>`;
    document.getElementById("step4Next").disabled = true;
    return;
  }

  grid.innerHTML = slots.map((time, idx) => {
    const bookedAppt = existing.find(a => a.time === time);
    const serial = idx + 1;
    if (bookedAppt) return `<div class="slot slot--booked">${time}<small>Serial ${serial} · Booked</small></div>`;
    return `<button type="button" class="slot slot--available" data-time="${time}" data-serial="${serial}">${time}<small>Serial ${serial} · Available</small></button>`;
  }).join("");

  grid.querySelectorAll(".slot--available").forEach(slot => {
    slot.addEventListener("click", () => {
      grid.querySelectorAll(".slot").forEach(s => s.classList.remove("slot--selected"));
      slot.classList.add("slot--selected");
      bookingState.time = slot.dataset.time;
      bookingState.serial = Number(slot.dataset.serial);
      document.getElementById("step4Next").disabled = false;
    });
  });
}

document.getElementById("step4Next")?.addEventListener("click", () => goToStep(5));

/* ================= STEP 5: Patient info + files ================= */
function wireStep5() {
  const form = document.getElementById("patientForm");
  const f = bookingState.form;
  if (f.fullName) document.getElementById("fullName").value = f.fullName;
  if (f.gender) document.getElementById("gender").value = f.gender;
  if (f.age) document.getElementById("age").value = f.age;
  if (f.phone) document.getElementById("phone").value = f.phone;
  if (f.whatsapp) document.getElementById("whatsapp").value = f.whatsapp;
  if (f.address) document.getElementById("address").value = f.address;

  document.getElementById("fileDropZone").addEventListener("click", () => document.getElementById("fileInput").click());
  document.getElementById("fileInput").addEventListener("change", (e) => {
    Array.from(e.target.files).forEach(file => {
      bookingState.files.push({ name: file.name, size: file.size });
    });
    renderFilePreview();
  });

  document.getElementById("step5Next").addEventListener("click", () => {
    if (!validateStep5()) { toast("Please fill in all required fields.", "error"); return; }
    captureStep5Data();
    computeFee();
    renderFeeStep();
    goToStep(6);
  });
}

function renderFilePreview() {
  document.getElementById("filePreviewList").innerHTML = bookingState.files.map((file, i) => `
    <div class="file-chip">📄 ${escapeHtml(file.name)} <button type="button" data-remove-file="${i}">✕</button></div>
  `).join("");
  document.querySelectorAll("[data-remove-file]").forEach(btn => {
    btn.addEventListener("click", () => {
      bookingState.files.splice(Number(btn.dataset.removeFile), 1);
      renderFilePreview();
    });
  });
}

function validateStep5() {
  let valid = true;
  const required = [
    ["fullName", v => v.trim().length > 1],
    ["gender", v => v.length > 0],
    ["age", v => v > 0 && v < 130],
    ["phone", v => /^[0-9+\-\s]{7,15}$/.test(v)],
    ["problem", v => v.trim().length > 1]
  ];
  required.forEach(([id, test]) => {
    const el = document.getElementById(id);
    const field = el.closest(".field");
    if (!test(el.value)) { field.classList.add("has-error"); valid = false; }
    else field.classList.remove("has-error");
  });
  return valid;
}

function captureStep5Data() {
  bookingState.form = {
    fullName: document.getElementById("fullName").value.trim(),
    gender: document.getElementById("gender").value,
    age: document.getElementById("age").value,
    phone: document.getElementById("phone").value.trim(),
    whatsapp: document.getElementById("whatsapp").value.trim(),
    address: document.getElementById("address").value.trim(),
    problem: document.getElementById("problem").value.trim(),
    symptoms: document.getElementById("symptoms").value.trim(),
    duration: document.getElementById("duration").value.trim(),
    prevMedical: document.getElementById("prevMedical").value.trim(),
    allergy: document.getElementById("allergy").value.trim(),
    notes: document.getElementById("notes").value.trim()
  };
}

/* ================= STEP 6: Fee ================= */
function computeFee() {
  let type = "New";
  if (bookingState.patientType === "existing" && bookingState.existingPatient) {
    const lastRx = DB.getPrescriptions()
      .filter(r => r.patientId === bookingState.existingPatient.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (lastRx) {
      const daysSince = (new Date(bookingState.dateISO) - new Date(lastRx.date)) / 86400000;
      if (daysSince <= DOCTOR_CONFIG.fees.followUpValidityDays) type = "Follow-up";
    } else {
      type = "Follow-up"; // existing patient without rx on file still gets follow-up rate in this demo
    }
  }
  bookingState.form.visitType = type;
  bookingState.fee = type === "New" ? DOCTOR_CONFIG.fees.newPatient : DOCTOR_CONFIG.fees.followUp;
}

function renderFeeStep() {
  const chamber = DOCTOR_CONFIG.chambers.find(c => c.id === bookingState.chamberId);
  document.getElementById("feeTypeLabel").textContent = bookingState.form.visitType === "New" ? "New Patient" : "Existing / Follow-up";
  document.getElementById("feeChamberLabel").textContent = chamber.name;
  document.getElementById("feeDateLabel").textContent = `${formatDateHuman(bookingState.dateISO)}, ${bookingState.time} (Serial ${bookingState.serial})`;
  document.getElementById("feeTotal").textContent = formatCurrency(bookingState.fee);
  updateStickyBar();
}

function wireStep6() {
  document.getElementById("step6Next").addEventListener("click", () => {
    document.getElementById("payNowBtn").textContent = `Pay ${formatCurrency(bookingState.fee)} (Demo)`;
    goToStep(7);
  });
}

/* ================= STEP 7: Payment (mock) ================= */
function wireStep7() {
  document.querySelectorAll('.radio-card[data-method]').forEach(card => {
    card.addEventListener("click", () => {
      document.querySelectorAll('.radio-card[data-method]').forEach(c => c.classList.remove("is-selected"));
      card.classList.add("is-selected");
      card.querySelector("input").checked = true;
      bookingState.paymentMethod = card.querySelector("input").value;
      document.getElementById("payNowBtn").disabled = false;
    });
  });

  document.getElementById("payNowBtn").addEventListener("click", async () => {
    document.getElementById("payLoading").hidden = false;
    document.getElementById("payNowBtn").disabled = true;
    const init = await PaymentService.initializePayment({
      method: bookingState.paymentMethod, amount: bookingState.fee, appointmentRef: genId("REF")
    });
    const verified = await PaymentService.verifyPayment(init.transactionId);
    bookingState.transaction = { ...init, ...verified };
    document.getElementById("payLoading").hidden = true;
    finalizeAppointment();
  });
}

/* ================= Finalize + STEP 8: Confirmation ================= */
function finalizeAppointment() {
  const f = bookingState.form;
  let patientId = bookingState.existingPatient ? bookingState.existingPatient.id : genId("PT");

  DB.upsertPatient({
    id: patientId, name: f.fullName, gender: f.gender, age: f.age,
    phone: f.phone, whatsapp: f.whatsapp || f.phone, address: f.address, isDemo: false
  });

  const appt = {
    id: genId("APT"),
    patientId, patientName: f.fullName, phone: f.phone,
    chamberId: bookingState.chamberId, date: bookingState.dateISO, time: bookingState.time,
    serial: bookingState.serial, type: f.visitType, fee: bookingState.fee,
    status: "Confirmed", problem: f.problem, symptoms: f.symptoms, duration: f.duration,
    prevMedical: f.prevMedical, allergy: f.allergy, notes: f.notes,
    attachedFiles: bookingState.files.map(x => x.name),
    paymentStatus: "Paid", paymentMethod: bookingState.paymentMethod,
    transactionId: bookingState.transaction.transactionId,
    isDemo: false, createdAt: new Date().toISOString()
  };
  DB.addAppointment(appt);
  bookingState.appointment = appt;
  DB.addNotification({ id: genId("NTF"), title: "Appointment confirmed", body: `Serial ${appt.serial} on ${formatDateHuman(appt.date)} at ${appt.time}.`, read: false, createdAt: new Date().toISOString(), isDemo: false });

  renderConfirmation(appt);
  goToStep(8);
}

function renderConfirmation(appt) {
  const chamber = DOCTOR_CONFIG.chambers.find(c => c.id === appt.chamberId);
  const qrData = encodeURIComponent(appt.id);
  document.getElementById("confirmCard").innerHTML = `
    <div class="flex justify-between flex-wrap gap-4">
      <div>
        <p class="xs muted" style="margin:0;">Appointment ID</p>
        <h3 style="margin:0 0 var(--sp-4);">${appt.id}</h3>
        <p class="small" style="margin:0;"><strong>Patient:</strong> ${escapeHtml(appt.patientName)}</p>
        <p class="small" style="margin:0;"><strong>Doctor:</strong> ${DOCTOR_CONFIG.name}</p>
        <p class="small" style="margin:0;"><strong>Chamber:</strong> ${chamber.name}</p>
        <p class="small" style="margin:0;"><strong>Date &amp; time:</strong> ${formatDateHuman(appt.date)}, ${appt.time}</p>
        <p class="small" style="margin:0;"><strong>Serial:</strong> ${appt.serial}</p>
        <p class="small" style="margin:0;"><strong>Fee paid:</strong> ${formatCurrency(appt.fee)}</p>
        <p class="small" style="margin:0;"><strong>Payment:</strong> <span class="badge badge--success">Paid via ${appt.paymentMethod} (Demo)</span></p>
      </div>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${qrData}" alt="Appointment QR code" width="140" height="140" style="border-radius:var(--radius-sm);background:#fff;">
    </div>
  `;
}

function wireStep8() {
  document.getElementById("printBtn").addEventListener("click", () => window.print());

  document.getElementById("downloadBtn").addEventListener("click", () => {
    const appt = bookingState.appointment;
    const chamber = DOCTOR_CONFIG.chambers.find(c => c.id === appt.chamberId);
    const text = `APPOINTMENT CONFIRMATION\n\nAppointment ID: ${appt.id}\nPatient: ${appt.patientName}\nDoctor: ${DOCTOR_CONFIG.name}\nChamber: ${chamber.name}\nAddress: ${chamber.address}\nDate: ${formatDateHuman(appt.date)}\nTime: ${appt.time}\nSerial: ${appt.serial}\nFee paid: ${formatCurrency(appt.fee)}\nPayment: ${appt.paymentMethod} (Demo)\n`;
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${appt.id}-appointment.txt`;
    a.click();
    toast("Appointment details downloaded.", "success");
  });

  document.getElementById("calendarBtn").addEventListener("click", () => {
    const appt = bookingState.appointment;
    const chamber = DOCTOR_CONFIG.chambers.find(c => c.id === appt.chamberId);
    const dt = icsDateTime(appt.date, appt.time);
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:Appointment with ${DOCTOR_CONFIG.name}\nLOCATION:${chamber.address}\nDESCRIPTION:Serial ${appt.serial}, Appointment ID ${appt.id}\nDTSTART:${dt}\nDTEND:${dt}\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([ics], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${appt.id}.ics`;
    a.click();
    toast("Calendar file downloaded — open it to add the event.", "success");
  });
}

function icsDateTime(dateISO, timeLabel) {
  const [time, meridian] = timeLabel.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (meridian === "PM" && h !== 12) h += 12;
  if (meridian === "AM" && h === 12) h = 0;
  return `${dateISO.replace(/-/g, "")}T${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
}
