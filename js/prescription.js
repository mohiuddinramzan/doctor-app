/**
 * prescription.js — powers prescription.html in two modes:
 *  - VIEW mode: ?rxId=RX-xxxx shows a saved prescription (print/download)
 *  - CREATE mode (default): doctor writes a new prescription
 */
let rxMedicines = [{ name: "", dose: "", frequency: "1+0+1", duration: "", timing: "After meal" }];
let rxPatient = null;

document.addEventListener("DOMContentLoaded", () => {
  const rxId = qs("rxId");
  if (rxId) { renderViewMode(rxId); return; }

  document.getElementById("rxDate").value = new Date().toISOString().slice(0, 10);
  document.getElementById("rxLookupBtn").addEventListener("click", lookupRxPatient);

  const prefillPatient = qs("patientId");
  if (prefillPatient) { document.getElementById("rxPatientLookup").value = prefillPatient; lookupRxPatient(); }
  else renderEditSheet();
});

/* ---------------- VIEW MODE ---------------- */
function renderViewMode(rxId) {
  const rx = DB.getPrescriptions().find(r => r.id === rxId);
  document.getElementById("createMode").hidden = true;
  const viewArea = document.getElementById("viewMode");
  viewArea.hidden = false;
  if (!rx) { viewArea.innerHTML = `<div class="empty-state">Prescription not found.</div>`; return; }

  document.getElementById("pageTitle").textContent = `Prescription — ${rx.patientName}`;
  document.getElementById("rxViewSheet").innerHTML = buildRxSheetHtml(rx, false);

  document.getElementById("printViewBtn").addEventListener("click", () => window.print());
  document.getElementById("downloadViewBtn").addEventListener("click", () => downloadRxAsText(rx));
}

/* ---------------- CREATE MODE ---------------- */
function lookupRxPatient() {
  const query = document.getElementById("rxPatientLookup").value.trim();
  const patient = DB.findPatientByPhone(query);
  const infoEl = document.getElementById("rxPatientInfo");
  if (!patient) { infoEl.innerHTML = `<span style="color:var(--color-error);">No patient found.</span>`; rxPatient = null; return; }
  rxPatient = patient;
  infoEl.innerHTML = `✅ ${escapeHtml(patient.name)}, ${patient.age} yrs, ${patient.gender} — ${patient.phone}`;
  rxMedicines = [{ name: "", dose: "", frequency: "1+0+1", duration: "", timing: "After meal" }];
  renderEditSheet();
}

function renderEditSheet() {
  const sheet = document.getElementById("rxEditSheet");
  sheet.innerHTML = `
    <div class="rx-sheet__head no-print">
      <div>
        <h3 style="margin:0;">${DOCTOR_CONFIG.name}</h3>
        <p class="small" style="margin:0;">${DOCTOR_CONFIG.credentials}</p>
        <p class="xs muted" style="margin:0;">${DOCTOR_CONFIG.registration}</p>
      </div>
      <div class="text-right"><p class="small" style="margin:0;"><strong>Patient:</strong> ${rxPatient ? escapeHtml(rxPatient.name) : "— select above —"}</p></div>
    </div>
    <div class="field"><label for="diagnosis">Diagnosis / clinical impression</label><input type="text" id="diagnosis" placeholder="e.g. Stable Angina, Hypertension"></div>
    <div class="rx-sheet__rx-mark">℞</div>
    <div id="medicineRows"></div>
    <button class="btn btn--ghost btn--sm no-print" id="addMedicineBtn" style="margin:var(--sp-3) 0;">+ Add medicine</button>
    <div class="form-grid form-grid--2" style="margin-top:var(--sp-4);">
      <div class="field"><label for="advice">Advice</label><textarea id="advice" rows="2" placeholder="Diet, activity, lifestyle advice"></textarea></div>
      <div class="field"><label for="followUpDate">Follow-up date</label><input type="date" id="followUpDate"></div>
    </div>
    <div class="flex flex-wrap gap-2 no-print">
      <button class="btn btn--secondary" id="previewRxBtn">Preview</button>
      <button class="btn btn--primary" id="saveRxBtn">Save Prescription</button>
    </div>
  `;
  renderMedicineRows();
  document.getElementById("addMedicineBtn").addEventListener("click", () => {
    rxMedicines.push({ name: "", dose: "", frequency: "1+0+1", duration: "", timing: "After meal" });
    renderMedicineRows();
  });
  document.getElementById("previewRxBtn").addEventListener("click", previewRx);
  document.getElementById("saveRxBtn").addEventListener("click", saveRx);
}

function renderMedicineRows() {
  const host = document.getElementById("medicineRows");
  if (!host) return;
  host.innerHTML = rxMedicines.map((m, i) => `
    <div class="rx-medicine-row" data-idx="${i}">
      <input type="text" placeholder="Medicine name" value="${escapeHtml(m.name)}" data-field="name">
      <input type="text" placeholder="Dose e.g. 20mg" value="${escapeHtml(m.dose)}" data-field="dose">
      <input type="text" placeholder="1+0+1" value="${escapeHtml(m.frequency)}" data-field="frequency">
      <input type="text" placeholder="Duration" value="${escapeHtml(m.duration)}" data-field="duration">
      <select data-field="timing">
        <option ${m.timing === "Before meal" ? "selected" : ""}>Before meal</option>
        <option ${m.timing === "After meal" ? "selected" : ""}>After meal</option>
      </select>
      <button type="button" class="btn btn--ghost btn--sm no-print" data-remove-med="${i}">✕</button>
    </div>
  `).join("");

  host.querySelectorAll("input, select").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = Number(e.target.closest(".rx-medicine-row").dataset.idx);
      rxMedicines[idx][e.target.dataset.field] = e.target.value;
    });
  });
  host.querySelectorAll("[data-remove-med]").forEach(btn => {
    btn.addEventListener("click", () => { rxMedicines.splice(Number(btn.dataset.removeMed), 1); renderMedicineRows(); });
  });
}

function previewRx() {
  if (!validateRx()) return;
  toast("This is exactly how the saved prescription will look when printed.", "info");
  window.print();
}

function validateRx() {
  if (!rxPatient) { toast("Look up a patient first.", "error"); return false; }
  const diagnosis = document.getElementById("diagnosis").value.trim();
  if (!diagnosis) { toast("Enter a diagnosis / clinical impression.", "error"); return false; }
  if (!rxMedicines.length || !rxMedicines.some(m => m.name.trim())) { toast("Add at least one medicine.", "error"); return false; }
  return true;
}

function saveRx() {
  if (!validateRx()) return;
  const rx = {
    id: genId("RX"),
    patientId: rxPatient.id,
    patientName: rxPatient.name,
    date: document.getElementById("rxDate").value,
    diagnosis: document.getElementById("diagnosis").value.trim(),
    medicines: rxMedicines.filter(m => m.name.trim()),
    advice: document.getElementById("advice").value.trim(),
    followUpDate: document.getElementById("followUpDate").value,
    isDemo: false
  };
  DB.addPrescription(rx);
  DB.addNotification({ id: genId("NTF"), title: "Prescription ready", body: `A new prescription is ready for ${rx.patientName}.`, read: false, createdAt: new Date().toISOString(), isDemo: false });
  toast("Prescription saved.", "success");
  setTimeout(() => { window.location.href = `prescription.html?rxId=${rx.id}`; }, 700);
}

/* ---------------- Shared render for saved rx (used by view mode) ---------------- */
function buildRxSheetHtml(rx, editable) {
  return `
    <div class="rx-sheet__head">
      <div>
        <h3 style="margin:0;">${DOCTOR_CONFIG.name}</h3>
        <p class="small" style="margin:0;">${DOCTOR_CONFIG.credentials}</p>
        <p class="xs muted" style="margin:0;">${DOCTOR_CONFIG.registration}</p>
      </div>
      <div class="text-right">
        <p class="small" style="margin:0;"><strong>Patient:</strong> ${escapeHtml(rx.patientName)}</p>
        <p class="small" style="margin:0;"><strong>Date:</strong> ${formatDateHuman(rx.date)}</p>
      </div>
    </div>
    <p class="small"><strong>Diagnosis:</strong> ${escapeHtml(rx.diagnosis)}</p>
    <div class="rx-sheet__rx-mark">℞</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Medicine</th><th>Dose</th><th>Frequency</th><th>Duration</th><th>Timing</th></tr></thead>
        <tbody>${rx.medicines.map(m => `<tr><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.dose)}</td><td>${escapeHtml(m.frequency)}</td><td>${escapeHtml(m.duration)}</td><td>${escapeHtml(m.timing)}</td></tr>`).join("")}</tbody>
      </table>
    </div>
    ${rx.advice ? `<p class="small" style="margin-top:var(--sp-4);"><strong>Advice:</strong> ${escapeHtml(rx.advice)}</p>` : ""}
    ${rx.followUpDate ? `<p class="small"><strong>Follow-up date:</strong> ${formatDateHuman(rx.followUpDate)}</p>` : ""}
    <p class="xs muted" style="margin-top:var(--sp-5);">This is a demo digital record and does not constitute medical advice outside the context of an actual consultation.</p>
  `;
}

function downloadRxAsText(rx) {
  const text = `PRESCRIPTION\n\n${DOCTOR_CONFIG.name}\n${DOCTOR_CONFIG.credentials}\n${DOCTOR_CONFIG.registration}\n\nPatient: ${rx.patientName}\nDate: ${formatDateHuman(rx.date)}\nDiagnosis: ${rx.diagnosis}\n\nMedicines:\n${rx.medicines.map(m => `- ${m.name} ${m.dose} — ${m.frequency}, ${m.duration} (${m.timing})`).join("\n")}\n\nAdvice: ${rx.advice || "-"}\nFollow-up: ${rx.followUpDate ? formatDateHuman(rx.followUpDate) : "-"}\n`;
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${rx.id}-prescription.txt`;
  a.click();
}
