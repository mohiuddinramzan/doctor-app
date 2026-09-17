/**
 * appointments.js — patient-facing appointment lookup + queue tracker
 */
let activeRescheduleId = null;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("findBtn").addEventListener("click", runLookup);
  document.getElementById("findInput").addEventListener("keydown", (e) => { if (e.key === "Enter") runLookup(); });
  document.getElementById("rescheduleClose").addEventListener("click", closeRescheduleModal);
  document.getElementById("confirmRescheduleBtn").addEventListener("click", confirmReschedule);

  const prefill = qs("q");
  if (prefill) { document.getElementById("findInput").value = prefill; runLookup(); }
});

function runLookup() {
  const query = document.getElementById("findInput").value.trim();
  const area = document.getElementById("resultsArea");
  if (!query) { toast("Enter a phone number or patient ID.", "error"); return; }

  area.innerHTML = `<div class="loading-state"><div class="spinner"></div> Looking up your appointments…</div>`;

  setTimeout(() => {
    const patient = DB.findPatientByPhone(query);
    const appts = DB.getAppointments().filter(a => a.phone === query || a.patientId === query || (patient && a.patientId === patient.id));

    if (!appts.length) {
      area.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🔍</div><p>No appointments found for "${escapeHtml(query)}".</p><a href="booking.html" class="btn btn--primary">Book an appointment</a></div>`;
      return;
    }
    renderResults(appts.sort((a, b) => new Date(b.date) - new Date(a.date)));
  }, 400);
}

function renderResults(appts) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = appts.filter(a => a.date >= today && a.status !== "Cancelled" && a.status !== "Completed");
  const past = appts.filter(a => !upcoming.includes(a));

  let html = "";

  if (upcoming.length) {
    html += `<h3>Upcoming</h3><div class="card-grid" style="margin-bottom:var(--sp-7);">`;
    upcoming.forEach(a => { html += renderQueueCard(a) + renderApptCard(a, true); });
    html += `</div>`;
  }

  html += `<h3>History</h3>`;
  html += past.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Serial</th><th>Chamber</th><th>Status</th><th></th></tr></thead>
      <tbody>${past.map(a => `
        <tr>
          <td>${formatDateHuman(a.date)}</td>
          <td>${a.serial}</td>
          <td>${DOCTOR_CONFIG.chambers.find(c => c.id === a.chamberId)?.name || "-"}</td>
          <td><span class="badge status-${a.status.replace(" ", "-")}">${a.status}</span></td>
          <td><a class="link-btn" href="prescription.html?patientId=${a.patientId}">View Rx</a></td>
        </tr>`).join("")}</tbody>
    </table></div>` : `<div class="empty-state empty-state--sm">No past appointments yet.</div>`;

  document.getElementById("resultsArea").innerHTML = html;
  wireResultActions();
}

function renderQueueCard(a) {
  const dayAppts = DB.getAppointmentsForDate(a.date, a.chamberId).filter(x => x.status !== "Cancelled");
  const currentServing = dayAppts.find(x => x.status === "Called");
  const currentSerial = currentServing ? currentServing.serial : Math.max(0, ...dayAppts.filter(x => x.status === "Completed").map(x => x.serial), 0);
  const ahead = Math.max(0, a.serial - currentSerial - 1);
  const pct = Math.min(100, Math.round((currentSerial / Math.max(a.serial, 1)) * 100));

  return `
    <div class="card queue-card">
      <span class="badge badge--neutral">Live queue</span>
      <div class="queue-card__numbers">
        <div><div class="queue-card__number">${a.serial}</div><div class="queue-card__label">Your serial</div></div>
        <div><div class="queue-card__number">${currentSerial || "–"}</div><div class="queue-card__label">Current serial</div></div>
        <div><div class="queue-card__number">${ahead}</div><div class="queue-card__label">Patients ahead</div></div>
      </div>
      <div class="queue-progress"><div class="queue-progress__bar" style="width:${pct}%"></div></div>
      <p class="xs muted" style="margin-top:var(--sp-3);">Status: <span class="badge status-${a.status.replace(" ", "-")}">${a.status}</span></p>
    </div>`;
}

function renderApptCard(a, showActions) {
  const chamber = DOCTOR_CONFIG.chambers.find(c => c.id === a.chamberId);
  return `
    <div class="card" data-appt-id="${a.id}">
      <h3 style="margin-bottom:var(--sp-2);">${escapeHtml(a.patientName)}</h3>
      <p class="small" style="margin:0;"><strong>Doctor:</strong> ${DOCTOR_CONFIG.name}</p>
      <p class="small" style="margin:0;"><strong>Chamber:</strong> ${chamber?.name}</p>
      <p class="small" style="margin:0;"><strong>Date:</strong> ${formatDateHuman(a.date)}</p>
      <p class="small" style="margin:0 0 var(--sp-3);"><strong>Time:</strong> ${a.time} · Serial ${a.serial}</p>
      ${showActions ? `
      <div class="flex flex-wrap gap-2">
        <a href="tel:${DOCTOR_CONFIG.phone}" class="btn btn--secondary btn--sm">Contact Doctor</a>
        <button class="btn btn--secondary btn--sm" data-act="reschedule">Reschedule</button>
        <button class="btn btn--danger btn--sm" data-act="cancel">Cancel</button>
      </div>` : ""}
    </div>`;
}

function wireResultActions() {
  document.querySelectorAll("[data-appt-id]").forEach(card => {
    const id = card.dataset.apptId;
    card.querySelector("[data-act='cancel']")?.addEventListener("click", () => {
      if (confirmAction("Cancel this appointment? This cannot be undone.")) {
        DB.updateAppointment(id, { status: "Cancelled" });
        pushNotification("Appointment cancelled", `Your appointment (${id}) has been cancelled.`);
        toast("Appointment cancelled.", "success");
        runLookup();
      }
    });
    card.querySelector("[data-act='reschedule']")?.addEventListener("click", () => openRescheduleModal(id));
  });
}

/* ---------------- Reschedule flow ---------------- */
function openRescheduleModal(apptId) {
  activeRescheduleId = apptId;
  const appt = DB.getAppointments().find(a => a.id === apptId);
  const dateInput = document.getElementById("rescheduleDate");
  dateInput.min = new Date().toISOString().slice(0, 10);
  dateInput.value = appt.date;
  dateInput.onchange = () => populateRescheduleTimes(appt);
  populateRescheduleTimes(appt);
  document.getElementById("rescheduleModal").removeAttribute("hidden");
}

function populateRescheduleTimes(appt) {
  const schedule = DB.getSchedule()[appt.chamberId];
  const date = document.getElementById("rescheduleDate").value;
  const dow = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" });
  const select = document.getElementById("rescheduleTime");

  if (!schedule.visitingDays.includes(dow) || schedule.holidays.includes(date)) {
    select.innerHTML = `<option value="">Chamber closed this day</option>`;
    return;
  }
  const slots = generateTimeSlots(schedule.startTime, schedule.endTime, schedule.slotMinutes);
  const booked = DB.getAppointmentsForDate(date, appt.chamberId).filter(a => a.status !== "Cancelled").map(a => a.time);
  select.innerHTML = slots.map(t => `<option value="${t}" ${booked.includes(t) ? "disabled" : ""}>${t}${booked.includes(t) ? " (booked)" : ""}</option>`).join("");
}

function closeRescheduleModal() { document.getElementById("rescheduleModal").setAttribute("hidden", ""); }

function confirmReschedule() {
  const date = document.getElementById("rescheduleDate").value;
  const time = document.getElementById("rescheduleTime").value;
  if (!time) { toast("Pick an available time.", "error"); return; }
  const appt = DB.getAppointments().find(a => a.id === activeRescheduleId);
  const newSerial = (DB.getAppointmentsForDate(date, appt.chamberId).filter(a => a.status !== "Cancelled").length) + 1;
  DB.updateAppointment(appt.id, { date, time, serial: newSerial, status: "Confirmed" });
  pushNotification("Appointment rescheduled", `Now on ${formatDateHuman(date)} at ${time}, serial ${newSerial}.`);
  toast("Appointment rescheduled.", "success");
  closeRescheduleModal();
  runLookup();
}
