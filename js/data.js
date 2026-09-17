/**
 * data.js
 * ------------------------------------------------------------------
 * The ONLY module that talks to localStorage directly.
 * Every other file calls the DB.* functions below. This keeps
 * storage logic in one place so it can later be swapped for real
 * API calls without touching the rest of the app.
 *
 * Keys are namespaced under "dapp_" (Doctor App).
 * All demo/seed records are tagged isDemo:true.
 * ------------------------------------------------------------------
 */

const DB_KEYS = {
  patients: "dapp_patients",
  appointments: "dapp_appointments",
  prescriptions: "dapp_prescriptions",
  reports: "dapp_reports",
  notifications: "dapp_notifications",
  family: "dapp_family",
  schedule: "dapp_schedule",
  session: "dapp_session",
  seeded: "dapp_seeded_v1"
};

function _read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error("Storage read failed for", key, e);
    return fallback;
  }
}

function _write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error("Storage write failed for", key, e);
    return false;
  }
}

function genId(prefix) {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const time = Date.now().toString(36).slice(-4).toUpperCase();
  return `${prefix}-${time}${rand}`;
}

const DB = {
  // ---- generic ----
  getAll(key) { return _read(key, []); },
  saveAll(key, arr) { return _write(key, arr); },

  // ---- patients ----
  getPatients() { return _read(DB_KEYS.patients, []); },
  savePatients(list) { return _write(DB_KEYS.patients, list); },
  findPatientByPhone(phone) {
    return this.getPatients().find(p => p.phone === phone || p.id === phone);
  },
  upsertPatient(patient) {
    const list = this.getPatients();
    const idx = list.findIndex(p => p.id === patient.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...patient };
    else list.push(patient);
    this.savePatients(list);
    return patient;
  },

  // ---- appointments ----
  getAppointments() { return _read(DB_KEYS.appointments, []); },
  saveAppointments(list) { return _write(DB_KEYS.appointments, list); },
  addAppointment(appt) {
    const list = this.getAppointments();
    list.push(appt);
    this.saveAppointments(list);
    return appt;
  },
  updateAppointment(id, patch) {
    const list = this.getAppointments();
    const idx = list.findIndex(a => a.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    this.saveAppointments(list);
    return list[idx];
  },
  getAppointmentsForDate(dateISO, chamberId) {
    return this.getAppointments().filter(a => a.date === dateISO && (!chamberId || a.chamberId === chamberId));
  },

  // ---- prescriptions ----
  getPrescriptions() { return _read(DB_KEYS.prescriptions, []); },
  savePrescriptions(list) { return _write(DB_KEYS.prescriptions, list); },
  addPrescription(rx) {
    const list = this.getPrescriptions();
    list.push(rx);
    this.savePrescriptions(list);
    return rx;
  },

  // ---- reports ----
  getReports() { return _read(DB_KEYS.reports, []); },
  saveReports(list) { return _write(DB_KEYS.reports, list); },
  addReport(r) {
    const list = this.getReports();
    list.push(r);
    this.saveReports(list);
    return r;
  },
  deleteReport(id) {
    const list = this.getReports().filter(r => r.id !== id);
    this.saveReports(list);
  },

  // ---- notifications ----
  getNotifications() { return _read(DB_KEYS.notifications, []); },
  saveNotifications(list) { return _write(DB_KEYS.notifications, list); },
  addNotification(n) {
    const list = this.getNotifications();
    list.unshift(n);
    this.saveNotifications(list);
    return n;
  },
  markAllRead() {
    const list = this.getNotifications().map(n => ({ ...n, read: true }));
    this.saveNotifications(list);
  },

  // ---- family members ----
  getFamily(patientId) {
    return _read(DB_KEYS.family, []).filter(f => f.ownerId === patientId);
  },
  addFamilyMember(member) {
    const list = _read(DB_KEYS.family, []);
    list.push(member);
    _write(DB_KEYS.family, list);
    return member;
  },

  // ---- schedule ----
  getSchedule() { return _read(DB_KEYS.schedule, {}); },
  saveSchedule(sch) { return _write(DB_KEYS.schedule, sch); },

  // ---- session (very light demo auth) ----
  getSession() { return _read(DB_KEYS.session, null); },
  setSession(s) { return _write(DB_KEYS.session, s); },
  clearSession() { localStorage.removeItem(DB_KEYS.session); }
};

/* ==================================================================
   DEMO DATA SEEDING — runs once per browser, clearly marked as demo
   ================================================================== */
function seedDemoData() {
  if (_read(DB_KEYS.seeded, false)) return;

  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };

  // ---- Demo patients ----
  const patients = [
    { id: "PT-1001", name: "Kamal Hossain", gender: "Male", age: 52, phone: "01812345001", whatsapp: "01812345001", address: "Mirpur, Dhaka", isDemo: true },
    { id: "PT-1002", name: "Nusrat Jahan", gender: "Female", age: 34, phone: "01812345002", whatsapp: "01812345002", address: "Uttara, Dhaka", isDemo: true },
    { id: "PT-1003", name: "Abdur Rahim", gender: "Male", age: 61, phone: "01812345003", whatsapp: "01812345003", address: "Dhanmondi, Dhaka", isDemo: true },
    { id: "PT-1004", name: "Shirin Akter", gender: "Female", age: 45, phone: "01812345004", whatsapp: "01812345004", address: "Mohammadpur, Dhaka", isDemo: true },
    { id: "PT-1005", name: "Tanvir Islam", gender: "Male", age: 29, phone: "01812345005", whatsapp: "01812345005", address: "Banani, Dhaka", isDemo: true }
  ];
  DB.savePatients(patients);

  // ---- Demo appointments (today + upcoming) ----
  const chamberId = DOCTOR_CONFIG.chambers[0].id;
  const statuses = ["Completed", "Completed", "Completed", "Called", "Waiting", "Confirmed"];
  const appointments = [];
  patients.forEach((p, i) => {
    appointments.push({
      id: genId("APT"),
      patientId: p.id,
      patientName: p.name,
      phone: p.phone,
      chamberId,
      date: iso(today),
      time: `${5 + Math.floor(i / 4)}:${(i % 4) * 15}0 PM`.replace("5:00 PM", "5:00 PM"),
      serial: i + 1,
      type: i % 2 === 0 ? "New" : "Follow-up",
      fee: i % 2 === 0 ? DOCTOR_CONFIG.fees.newPatient : DOCTOR_CONFIG.fees.followUp,
      status: statuses[i] || "Confirmed",
      problem: ["Chest pain", "Routine follow-up", "High blood pressure", "Palpitations", "Shortness of breath"][i],
      paymentStatus: "Paid",
      isDemo: true,
      createdAt: new Date().toISOString()
    });
  });
  // two upcoming appointments in the future
  [3, 7].forEach((offset, i) => {
    appointments.push({
      id: genId("APT"),
      patientId: patients[i].id,
      patientName: patients[i].name,
      phone: patients[i].phone,
      chamberId,
      date: iso(addDays(offset)),
      time: "6:00 PM",
      serial: 1,
      type: "Follow-up",
      fee: DOCTOR_CONFIG.fees.followUp,
      status: "Confirmed",
      problem: "Follow-up visit",
      paymentStatus: "Paid",
      isDemo: true,
      createdAt: new Date().toISOString()
    });
  });
  DB.saveAppointments(appointments);

  // ---- Demo prescriptions ----
  const prescriptions = [
    {
      id: genId("RX"),
      patientId: "PT-1001",
      patientName: "Kamal Hossain",
      date: iso(addDays(-30)),
      diagnosis: "Stable Angina, Hypertension",
      medicines: [
        { name: "Atorvastatin", dose: "20mg", frequency: "1+0+0", duration: "30 days", timing: "After meal" },
        { name: "Amlodipine", dose: "5mg", frequency: "1+0+0", duration: "30 days", timing: "After meal" }
      ],
      advice: "Low-salt diet, brisk walk 30 min daily, avoid smoking.",
      followUpDate: iso(addDays(-2)),
      isDemo: true
    },
    {
      id: genId("RX"),
      patientId: "PT-1003",
      patientName: "Abdur Rahim",
      date: iso(addDays(-15)),
      diagnosis: "Ischemic Heart Disease",
      medicines: [
        { name: "Clopidogrel", dose: "75mg", frequency: "1+0+0", duration: "60 days", timing: "After meal" },
        { name: "Metoprolol", dose: "25mg", frequency: "1+0+1", duration: "30 days", timing: "After meal" }
      ],
      advice: "Continue medicines regularly. Emergency review if chest pain recurs.",
      followUpDate: iso(addDays(15)),
      isDemo: true
    },
    {
      id: genId("RX"),
      patientId: "PT-1004",
      patientName: "Shirin Akter",
      date: iso(addDays(-7)),
      diagnosis: "Essential Hypertension",
      medicines: [
        { name: "Losartan", dose: "50mg", frequency: "1+0+0", duration: "30 days", timing: "After meal" }
      ],
      advice: "Home BP monitoring twice a week.",
      followUpDate: iso(addDays(23)),
      isDemo: true
    }
  ];
  DB.savePrescriptions(prescriptions);

  // ---- Demo notifications ----
  const notifications = [
    { id: genId("NTF"), title: "Appointment confirmed", body: "Your serial for tomorrow's visit is confirmed.", read: false, createdAt: new Date().toISOString(), isDemo: true },
    { id: genId("NTF"), title: "Prescription ready", body: "Dr. Farhana Ahmed has uploaded your prescription.", read: false, createdAt: new Date().toISOString(), isDemo: true },
    { id: genId("NTF"), title: "Serial approaching", body: "Only 3 patients ahead of you now.", read: true, createdAt: new Date().toISOString(), isDemo: true }
  ];
  DB.saveNotifications(notifications);

  // ---- Demo schedule (derived from chambers but stored so it's editable) ----
  const schedule = {};
  DOCTOR_CONFIG.chambers.forEach(ch => {
    schedule[ch.id] = {
      visitingDays: ch.visitingDays,
      startTime: ch.visitingHours.split("–")[0].trim(),
      endTime: ch.visitingHours.split("–")[1].trim(),
      slotMinutes: ch.slotMinutes,
      maxPatientsPerDay: ch.maxPatientsPerDay,
      holidays: []
    };
  });
  DB.saveSchedule(schedule);

  _write(DB_KEYS.seeded, true);
}
