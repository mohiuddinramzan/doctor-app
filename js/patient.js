/**
 * patient.js — powers patient.html (the patient portal)
 */
let currentPatient = null;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("loadDashboardBtn").addEventListener("click", loadDashboard);
  document.getElementById("patientIdInput").addEventListener("keydown", (e) => { if (e.key === "Enter") loadDashboard(); });
  wireSidebar();
  wireFamilyModal();

  const prefill = qs("patientId") || qs("q");
  if (prefill) { document.getElementById("patientIdInput").value = prefill; loadDashboard(); }
});

function loadDashboard() {
  const query = document.getElementById("patientIdInput").value.trim();
  const patient = DB.findPatientByPhone(query);
  if (!patient) {
    toast("No patient found with that phone/ID. Try a demo ID like PT-1001.", "error");
    return;
  }
  currentPatient = patient;
  document.getElementById("dashArea").hidden = false;
  document.getElementById("idGateCard").querySelector("h3, .field label")?.blur();
  renderProfile();
  renderUpcoming();
  renderPrevious();
  renderPrescriptions();
  renderReportsSummary();
  renderPayments();
  renderFamily();
  toast(`Welcome back, ${patient.name.split(" ")[0]}.`, "success");
}

function wireSidebar() {
  document.querySelectorAll(".dash__sidebar-link").forEach(link => {
    link.addEventListener("click", () => switchPanel(link.dataset.panel));
  });
  document.getElementById("mobilePanelSelect").addEventListener("change", (e) => switchPanel(e.target.value));
}

function switchPanel(name) {
  document.querySelectorAll(".dash__sidebar-link").forEach(l => l.classList.toggle("is-active", l.dataset.panel === name));
  document.querySelectorAll(".dash__panel").forEach(p => p.classList.toggle("is-active", p.dataset.panel === name));
  document.getElementById("mobilePanelSelect").value = name;
}

/* ---------------- Profile ---------------- */
function renderProfile() {
  const p = currentPatient;
  document.getElementById("profileCard").innerHTML = `
    <div class="flex gap-4 items-center" style="margin-bottom:var(--sp-4);">
      <div style="width:64px;height:64px;border-radius:50%;background:var(--color-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:1.4rem;">${p.name.charAt(0)}</div>
      <div><h3 style="margin:0;">${escapeHtml(p.name)}</h3><p class="small" style="margin:0;">Patient ID: ${p.id}</p></div>
    </div>
    <div class="form-grid form-grid--2">
      <p class="small" style="margin:0;"><strong>Gender:</strong> ${p.gender}</p>
      <p class="small" style="margin:0;"><strong>Age:</strong> ${p.age}</p>
      <p class="small" style="margin:0;"><strong>Phone:</strong> ${p.phone}</p>
      <p class="small" style="margin:0;"><strong>Address:</strong> ${p.address || "—"}</p>
    </div>
  `;
}

/* ---------------- Upcoming ---------------- */
function renderUpcoming() {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = DB.getAppointments()
    .filter(a => a.patientId === currentPatient.id && a.date >= today && a.status !== "Cancelled" && a.status !== "Completed")
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const area = document.getElementById("upcomingArea");
  if (!upcoming.length) {
    area.innerHTML = `<div class="empty-state"><div class="empty-state__icon">📅</div><p>No upcoming appointment.</p><a href="booking.html" class="btn btn--primary">Book an appointment</a></div>`;
    return;
  }
  area.innerHTML = upcoming.map(a => {
    const chamber = DOCTOR_CONFIG.chambers.find(c => c.id === a.chamberId);
    return `
    <div class="card" style="margin-bottom:var(--sp-4);">
      <div class="flex justify-between flex-wrap gap-3">
        <div>
          <p class="small" style="margin:0;"><strong>Doctor:</strong> ${DOCTOR_CONFIG.name}</p>
          <p class="small" style="margin:0;"><strong>Date:</strong> ${formatDateHuman(a.date)}</p>
          <p class="small" style="margin:0;"><strong>Time:</strong> ${a.time} · Serial ${a.serial}</p>
          <p class="small" style="margin:0;"><strong>Chamber:</strong> ${chamber?.name}</p>
          <p class="small" style="margin:0 0 var(--sp-3);"><strong>Status:</strong> <span class="badge status-${a.status.replace(" ", "-")}">${a.status}</span></p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <a href="appointments.html?q=${a.patientId}" class="btn btn--secondary btn--sm">View Appointment</a>
        <a href="tel:${DOCTOR_CONFIG.phone}" class="btn btn--secondary btn--sm">Contact Doctor</a>
      </div>
    </div>`;
  }).join("");
}

/* ---------------- Previous ---------------- */
function renderPrevious() {
  const today = new Date().toISOString().slice(0, 10);
  const past = DB.getAppointments()
    .filter(a => a.patientId === currentPatient.id && (a.date < today || a.status === "Completed" || a.status === "Cancelled"))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const area = document.getElementById("previousArea");
  if (!past.length) { area.innerHTML = `<div class="empty-state empty-state--sm">No previous visits yet.</div>`; return; }

  area.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Problem</th><th>Type</th><th>Fee</th><th>Status</th></tr></thead>
    <tbody>${past.map(a => `
      <tr><td>${formatDateHuman(a.date)}</td><td>${escapeHtml(a.problem || "-")}</td><td>${a.type}</td><td>${formatCurrency(a.fee)}</td>
      <td><span class="badge status-${a.status.replace(" ", "-")}">${a.status}</span></td></tr>`).join("")}
    </tbody></table></div>`;
}

/* ---------------- Prescriptions ---------------- */
function renderPrescriptions() {
  const rx = DB.getPrescriptions().filter(r => r.patientId === currentPatient.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const area = document.getElementById("prescriptionsArea");
  if (!rx.length) { area.innerHTML = `<div class="empty-state empty-state--sm">No prescriptions on file yet.</div>`; return; }
  area.innerHTML = rx.map(r => `
    <div class="card" style="margin-bottom:var(--sp-4);">
      <div class="flex justify-between flex-wrap gap-2"><strong>${formatDateHuman(r.date)}</strong><span class="badge badge--info">${escapeHtml(r.diagnosis)}</span></div>
      <ul class="small" style="margin:var(--sp-3) 0;">
        ${r.medicines.map(m => `<li>${escapeHtml(m.name)} ${m.dose} — ${m.frequency}, ${m.duration} (${m.timing})</li>`).join("")}
      </ul>
      <p class="small muted" style="margin:0 0 var(--sp-3);">${escapeHtml(r.advice || "")}</p>
      <a href="prescription.html?rxId=${r.id}" class="btn btn--secondary btn--sm">View &amp; print</a>
    </div>`).join("");
}

/* ---------------- Reports summary ---------------- */
function renderReportsSummary() {
  const reports = DB.getReports().filter(r => r.patientId === currentPatient.id);
  const area = document.getElementById("reportsArea");
  area.innerHTML = reports.length
    ? `<div class="card-grid">${reports.slice(0, 4).map(r => `<div class="card"><strong>${escapeHtml(r.name)}</strong><p class="xs muted" style="margin:4px 0 0;">${r.category} · ${formatDateHuman(r.date)}</p></div>`).join("")}</div>`
    : `<div class="empty-state empty-state--sm">No reports uploaded yet. <a href="reports.html">Upload one</a>.</div>`;
}

/* ---------------- Payments ---------------- */
function renderPayments() {
  const paid = DB.getAppointments().filter(a => a.patientId === currentPatient.id && a.paymentStatus === "Paid").sort((a, b) => new Date(b.date) - new Date(a.date));
  const area = document.getElementById("paymentsArea");
  if (!paid.length) { area.innerHTML = `<div class="empty-state empty-state--sm">No payments recorded.</div>`; return; }
  area.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
    <tbody>${paid.map(a => `<tr><td>${formatDateHuman(a.date)}</td><td>${formatCurrency(a.fee)}</td><td>${a.paymentMethod || "—"}</td><td><span class="badge badge--success">Paid</span></td></tr>`).join("")}</tbody>
  </table></div>`;
}

/* ---------------- Family members ---------------- */
function renderFamily() {
  const family = DB.getFamily(currentPatient.id);
  document.getElementById("familyGrid").innerHTML = [{ name: currentPatient.name, relation: "Myself", age: currentPatient.age, gender: currentPatient.gender, phone: currentPatient.phone }, ...family]
    .map(f => `
    <div class="card">
      <h3 style="margin-bottom:4px;">${escapeHtml(f.name)}</h3>
      <p class="xs muted" style="margin:0;">${f.relation}</p>
      <p class="small" style="margin:var(--sp-2) 0 var(--sp-3);">${f.gender}, ${f.age} yrs · ${f.phone}</p>
      <a href="booking.html" class="btn btn--secondary btn--sm">Book for ${f.relation === "Myself" ? "myself" : f.relation.toLowerCase()}</a>
    </div>`).join("");
}

function wireFamilyModal() {
  document.getElementById("addFamilyBtn").addEventListener("click", () => document.getElementById("familyModal").removeAttribute("hidden"));
  document.getElementById("familyModalClose").addEventListener("click", () => document.getElementById("familyModal").setAttribute("hidden", ""));
  document.getElementById("saveFamilyBtn").addEventListener("click", () => {
    const name = document.getElementById("famName").value.trim();
    const relation = document.getElementById("famRelation").value.trim();
    if (!name || !relation) { toast("Name and relation are required.", "error"); return; }
    DB.addFamilyMember({
      id: genId("FAM"), ownerId: currentPatient.id, name, relation,
      gender: document.getElementById("famGender").value,
      age: document.getElementById("famAge").value,
      phone: document.getElementById("famPhone").value
    });
    document.getElementById("familyModal").setAttribute("hidden", "");
    toast("Family member added.", "success");
    renderFamily();
  });
}
