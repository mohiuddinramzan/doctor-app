/**
 * doctor.js — powers doctor.html (public profile + admin dashboard)
 */
document.addEventListener("DOMContentLoaded", () => {
  renderPublicProfile();
  wireAdminGate();

  const session = DB.getSession();
  if (session && session.role === "doctor") showAdminDashboard();
});

/* ---------------- Public profile ---------------- */
function renderPublicProfile() {
  document.getElementById("degreeList").innerHTML = DOCTOR_CONFIG.degrees.map(d => `<li>🎓 ${d}</li>`).join("");
  document.getElementById("bioText2").textContent = DOCTOR_CONFIG.bio;
  document.getElementById("footerBio2").textContent = DOCTOR_CONFIG.bio.slice(0, 130) + "…";
  document.getElementById("footerChamber2").textContent = DOCTOR_CONFIG.chambers[0].name;
  document.getElementById("specGrid2").innerHTML = DOCTOR_CONFIG.specializations.map(s => `
    <div class="info-card card"><div class="info-card__icon">✚</div><div><h3>${s.title}</h3><p>${s.desc}</p></div></div>
  `).join("");
}

/* ---------------- Admin gate (demo auth only) ---------------- */
function wireAdminGate() {
  const toggleBtn = document.getElementById("toggleAdminBtn");
  const gate = document.getElementById("adminGate");
  const publicProfile = document.getElementById("publicProfile");

  if (location.hash === "#admin") { gate.hidden = false; publicProfile.hidden = true; }

  toggleBtn.addEventListener("click", () => {
    const session = DB.getSession();
    if (session && session.role === "doctor") { showAdminDashboard(); return; }
    publicProfile.hidden = true;
    gate.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.getElementById("pinSubmit").addEventListener("click", () => {
    const pin = document.getElementById("pinInput").value.trim();
    if (pin.length < 4) { toast("Enter at least 4 digits (demo — any PIN works).", "error"); return; }
    DB.setSession({ role: "doctor", loginAt: new Date().toISOString() });
    toast("Welcome back, Dr. Ahmed.", "success");
    showAdminDashboard();
  });
}

function showAdminDashboard() {
  document.getElementById("publicProfile").hidden = true;
  document.getElementById("adminGate").hidden = true;
  document.getElementById("adminDashboard").hidden = false;
  document.getElementById("toggleAdminBtn").textContent = "Dashboard";

  const dateInput = document.getElementById("dashDate");
  dateInput.value = new Date().toISOString().slice(0, 10);
  dateInput.addEventListener("change", () => renderDashboardForDate(dateInput.value));

  document.getElementById("logoutBtn").addEventListener("click", () => {
    DB.clearSession();
    location.hash = "";
    location.reload();
  });

  renderDashboardForDate(dateInput.value);
  renderScheduleGrid();
  populateHolidayChamberSelect();
  wireHistoryModal();
  document.getElementById("addHolidayBtn").addEventListener("click", addHolidayDay);
}

/* ---------------- Stats + appointment table ---------------- */
function renderDashboardForDate(dateISO) {
  const appts = DB.getAppointments().filter(a => a.date === dateISO);
  const completed = appts.filter(a => a.status === "Completed").length;
  const waiting = appts.filter(a => a.status === "Waiting" || a.status === "Confirmed").length;
  const cancelled = appts.filter(a => a.status === "Cancelled" || a.status === "No Show").length;
  const revenue = appts.filter(a => a.paymentStatus === "Paid").reduce((sum, a) => sum + Number(a.fee || 0), 0);
  const newP = appts.filter(a => a.type === "New").length;
  const returning = appts.filter(a => a.type === "Follow-up").length;

  document.getElementById("statGrid").innerHTML = `
    <div class="stat-card"><div class="stat-card__value">${appts.length}</div><div class="stat-card__label">Today's patients</div></div>
    <div class="stat-card"><div class="stat-card__value">${waiting}</div><div class="stat-card__label">Waiting</div></div>
    <div class="stat-card"><div class="stat-card__value">${completed}</div><div class="stat-card__label">Completed</div></div>
    <div class="stat-card"><div class="stat-card__value">${cancelled}</div><div class="stat-card__label">Cancelled / No-show</div></div>
    <div class="stat-card"><div class="stat-card__value">${newP}</div><div class="stat-card__label">New patients</div></div>
    <div class="stat-card"><div class="stat-card__value">${returning}</div><div class="stat-card__label">Returning patients</div></div>
    <div class="stat-card" style="grid-column: span 2;"><div class="stat-card__value">${formatCurrency(revenue)}</div><div class="stat-card__label">Today's revenue</div></div>
  `;
  renderApptTable(appts.sort((a, b) => a.serial - b.serial));
}

function renderApptTable(appts) {
  const body = document.getElementById("apptTableBody");
  if (!appts.length) {
    body.innerHTML = `<tr><td colspan="6"><div class="empty-state empty-state--sm">No appointments for this date.</div></td></tr>`;
    return;
  }
  body.innerHTML = appts.map(a => `
    <tr data-id="${a.id}">
      <td>${a.serial}</td>
      <td>${escapeHtml(a.patientName)}<div class="xs muted">${a.phone}</div></td>
      <td>${a.type}</td>
      <td>${a.time}</td>
      <td><span class="badge status-${a.status.replace(" ", "-")}">${a.status}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn btn--ghost btn--sm" data-act="view">View</button>
          <button class="btn btn--ghost btn--sm" data-act="call">Call</button>
          <button class="btn btn--secondary btn--sm" data-act="complete">Complete</button>
          <button class="btn btn--danger btn--sm" data-act="cancel">Cancel</button>
        </div>
      </td>
    </tr>
  `).join("");

  body.querySelectorAll("tr").forEach(row => {
    const id = row.dataset.id;
    row.querySelector("[data-act='view']").addEventListener("click", () => openPatientHistory(id));
    row.querySelector("[data-act='call']").addEventListener("click", () => {
      const appt = DB.getAppointments().find(a => a.id === id);
      window.location.href = `tel:${appt.phone}`;
    });
    row.querySelector("[data-act='complete']").addEventListener("click", () => updateStatusAndRefresh(id, "Completed"));
    row.querySelector("[data-act='cancel']").addEventListener("click", () => {
      if (confirmAction("Cancel this appointment?")) updateStatusAndRefresh(id, "Cancelled");
    });
  });
}

function updateStatusAndRefresh(id, status) {
  DB.updateAppointment(id, { status });
  toast(`Marked as ${status}.`, "success");
  renderDashboardForDate(document.getElementById("dashDate").value);
}

document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "nextPatientBtn") {
    const dateISO = document.getElementById("dashDate").value;
    const appts = DB.getAppointments().filter(a => a.date === dateISO && (a.status === "Waiting" || a.status === "Confirmed")).sort((a, b) => a.serial - b.serial);
    if (!appts.length) { toast("No waiting patients left in queue.", "info"); return; }
    // Call current "Called" back to Completed first if any
    const currentlyCalled = DB.getAppointments().find(a => a.date === dateISO && a.status === "Called");
    if (currentlyCalled) DB.updateAppointment(currentlyCalled.id, { status: "Completed" });
    DB.updateAppointment(appts[0].id, { status: "Called" });
    toast(`Now calling serial #${appts[0].serial} — ${appts[0].patientName}`, "success");
    renderDashboardForDate(dateISO);
  }
});

/* ---------------- Patient history modal ---------------- */
function wireHistoryModal() {
  document.getElementById("historyClose").addEventListener("click", () => {
    document.getElementById("historyModal").setAttribute("hidden", "");
  });
}

function openPatientHistory(apptId) {
  const appt = DB.getAppointments().find(a => a.id === apptId);
  if (!appt) return;
  document.getElementById("historyPatientName").textContent = `${appt.patientName} — history`;

  const past = DB.getAppointments().filter(a => a.patientId === appt.patientId).sort((a, b) => new Date(b.date) - new Date(a.date));
  const rx = DB.getPrescriptions().filter(r => r.patientId === appt.patientId).sort((a, b) => new Date(b.date) - new Date(a.date));

  const timelineHtml = past.map(p => `
    <div class="timeline-item">
      <div class="timeline-item__date">${formatDateHuman(p.date)}</div>
      <strong>${p.problem || "Visit"}</strong> — <span class="badge status-${p.status.replace(" ", "-")}">${p.status}</span>
      <p class="small" style="margin:4px 0 0;">Serial ${p.serial} · ${p.type} · ${formatCurrency(p.fee)}</p>
    </div>`).join("") || `<p class="small">No previous visits recorded.</p>`;

  const rxHtml = rx.map(r => `
    <div class="card" style="margin-bottom:var(--sp-3);">
      <div class="flex justify-between"><strong>${formatDateHuman(r.date)}</strong><span class="badge badge--info">${escapeHtml(r.diagnosis)}</span></div>
      <ul class="small" style="margin-top:var(--sp-2);">
        ${r.medicines.map(m => `<li>${m.name} ${m.dose} — ${m.frequency}, ${m.duration} (${m.timing})</li>`).join("")}
      </ul>
      <p class="small muted" style="margin:0;">${escapeHtml(r.advice)}</p>
    </div>`).join("") || `<p class="small">No prescriptions on file.</p>`;

  document.getElementById("historyContent").innerHTML = `
    <h3>Visit timeline</h3>
    <div class="timeline">${timelineHtml}</div>
    <h3>Prescriptions</h3>
    ${rxHtml}
    <a class="btn btn--primary btn--block" href="prescription.html?patientId=${appt.patientId}">Write new prescription</a>
  `;
  document.getElementById("historyModal").removeAttribute("hidden");
}

/* ---------------- Schedule management ---------------- */
function renderScheduleGrid() {
  const schedule = DB.getSchedule();
  const allDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const chamber = DOCTOR_CONFIG.chambers[0];
  const sch = schedule[chamber.id];

  document.getElementById("scheduleGrid").innerHTML = allDays.map(day => {
    const open = sch.visitingDays.includes(day);
    return `
      <div class="week-day-card ${open ? "" : "week-day-card--closed"}">
        <h4>${day}</h4>
        ${open ? `<p class="xs muted" style="margin:0;">${sch.startTime} – ${sch.endTime}</p><p class="xs muted" style="margin:0;">${sch.slotMinutes}-min slots · max ${sch.maxPatientsPerDay}/day</p>`
               : `<p class="xs muted" style="margin:0;">Closed</p>`}
      </div>`;
  }).join("") + (sch.holidays.length ? `
    <div class="week-day-card" style="grid-column: 1/-1;"><h4>Upcoming leave days</h4>
      <p class="xs muted" style="margin:0;">${sch.holidays.join(", ")}</p></div>` : "");
}

function populateHolidayChamberSelect() {
  const sel = document.getElementById("holidayChamber");
  sel.innerHTML = DOCTOR_CONFIG.chambers.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
}

function addHolidayDay() {
  const chamberId = document.getElementById("holidayChamber").value;
  const date = document.getElementById("holidayDate").value;
  if (!date) { toast("Pick a date first.", "error"); return; }
  const schedule = DB.getSchedule();
  if (!schedule[chamberId].holidays.includes(date)) schedule[chamberId].holidays.push(date);
  DB.saveSchedule(schedule);
  toast("Leave day added. It will be blocked on the booking calendar.", "success");
  renderScheduleGrid();
}
