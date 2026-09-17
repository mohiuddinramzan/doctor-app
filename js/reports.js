/**
 * reports.js — powers reports.html
 */
let reportsPatient = null;
let pendingReportFile = null;
let activeCategoryFilter = "All";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("loadReportsBtn").addEventListener("click", loadReportsPatient);
  document.getElementById("reportsPatientInput").addEventListener("keydown", (e) => { if (e.key === "Enter") loadReportsPatient(); });
  document.getElementById("reportDropZone").addEventListener("click", () => document.getElementById("reportFileInput").click());
  document.getElementById("reportFileInput").addEventListener("change", handleReportFileChosen);
  document.getElementById("uploadReportBtn").addEventListener("click", uploadReport);
  document.getElementById("reportDate").value = new Date().toISOString().slice(0, 10);
  document.getElementById("reportPreviewClose").addEventListener("click", () => document.getElementById("reportPreviewModal").setAttribute("hidden", ""));

  const prefill = qs("patientId") || qs("q");
  if (prefill) { document.getElementById("reportsPatientInput").value = prefill; loadReportsPatient(); }
});

function loadReportsPatient() {
  const query = document.getElementById("reportsPatientInput").value.trim();
  const patient = DB.findPatientByPhone(query);
  if (!patient) { toast("No patient found. Try a demo ID like PT-1001.", "error"); return; }
  reportsPatient = patient;
  document.getElementById("reportsUI").hidden = false;
  renderCategoryFilters();
  renderReportsGrid();
}

function handleReportFileChosen(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    pendingReportFile = { name: file.name, type: file.type, dataUrl: reader.result };
    document.getElementById("reportFilePreview").innerHTML = `
      <div class="file-chip">📄 ${escapeHtml(file.name)} <button type="button" id="clearReportFile">✕</button></div>`;
    document.getElementById("clearReportFile").addEventListener("click", () => {
      pendingReportFile = null;
      document.getElementById("reportFilePreview").innerHTML = "";
      document.getElementById("uploadReportBtn").disabled = true;
    });
    document.getElementById("uploadReportBtn").disabled = false;
  };
  reader.readAsDataURL(file);
}

function uploadReport() {
  if (!pendingReportFile) { toast("Choose a file first.", "error"); return; }
  DB.addReport({
    id: genId("RPT"),
    patientId: reportsPatient.id,
    name: pendingReportFile.name,
    category: document.getElementById("reportCategory").value,
    date: document.getElementById("reportDate").value,
    fileType: pendingReportFile.type,
    dataUrl: pendingReportFile.dataUrl,
    isDemo: false
  });
  pendingReportFile = null;
  document.getElementById("reportFilePreview").innerHTML = "";
  document.getElementById("uploadReportBtn").disabled = true;
  document.getElementById("reportFileInput").value = "";
  toast("Report uploaded.", "success");
  renderCategoryFilters();
  renderReportsGrid();
}

function renderCategoryFilters() {
  const categories = ["All", "Blood Test", "X-Ray", "MRI", "CT Scan", "Ultrasound", "Prescription", "Other"];
  document.getElementById("categoryFilters").innerHTML = categories.map(c => `
    <button type="button" class="btn ${c === activeCategoryFilter ? "btn--primary" : "btn--ghost"} btn--sm" data-filter="${c}">${c}</button>
  `).join("");
  document.querySelectorAll("[data-filter]").forEach(btn => {
    btn.addEventListener("click", () => { activeCategoryFilter = btn.dataset.filter; renderCategoryFilters(); renderReportsGrid(); });
  });
}

function renderReportsGrid() {
  let reports = DB.getReports().filter(r => r.patientId === reportsPatient.id);
  if (activeCategoryFilter !== "All") reports = reports.filter(r => r.category === activeCategoryFilter);
  reports.sort((a, b) => new Date(b.date) - new Date(a.date));

  const grid = document.getElementById("reportsGrid");
  if (!reports.length) { grid.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🧪</div><p>No reports in this category yet.</p></div>`; return; }

  grid.innerHTML = reports.map(r => `
    <div class="card" data-report-id="${r.id}">
      <span class="badge badge--info">${r.category}</span>
      <h3 style="margin:var(--sp-2) 0 4px; font-size:var(--fs-sm);">${escapeHtml(r.name)}</h3>
      <p class="xs muted" style="margin:0 0 var(--sp-3);">${formatDateHuman(r.date)}</p>
      <div class="flex gap-2 flex-wrap">
        <button class="btn btn--secondary btn--sm" data-act="preview">Preview</button>
        <button class="btn btn--secondary btn--sm" data-act="download">Download</button>
        <button class="btn btn--danger btn--sm" data-act="delete">Delete</button>
      </div>
    </div>`).join("");

  grid.querySelectorAll("[data-report-id]").forEach(card => {
    const id = card.dataset.reportId;
    const report = reports.find(r => r.id === id);
    card.querySelector("[data-act='preview']").addEventListener("click", () => previewReport(report));
    card.querySelector("[data-act='download']").addEventListener("click", () => downloadReport(report));
    card.querySelector("[data-act='delete']").addEventListener("click", () => {
      if (confirmAction("Delete this report? This cannot be undone.")) {
        DB.deleteReport(id);
        toast("Report deleted.", "success");
        renderReportsGrid();
      }
    });
  });
}

function previewReport(report) {
  document.getElementById("reportPreviewTitle").textContent = report.name;
  const isImage = report.fileType && report.fileType.startsWith("image/");
  document.getElementById("reportPreviewBody").innerHTML = isImage
    ? `<img src="${report.dataUrl}" alt="${escapeHtml(report.name)}" style="border-radius:var(--radius-md);">`
    : `<div class="empty-state empty-state--sm">📄 Preview isn't available for this file type in the demo. Use Download to open it.</div>`;
  document.getElementById("reportPreviewModal").removeAttribute("hidden");
}

function downloadReport(report) {
  const a = document.createElement("a");
  a.href = report.dataUrl;
  a.download = report.name;
  a.click();
}
