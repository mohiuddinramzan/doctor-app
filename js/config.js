/**
 * config.js
 * ------------------------------------------------------------------
 * SINGLE SOURCE OF TRUTH for this doctor's practice.
 * Every page reads from DOCTOR_CONFIG / APP_SETTINGS instead of
 * hardcoding names, numbers, fees or links. Edit this file only —
 * nothing else in the project should need to change when the
 * doctor's information changes.
 * ------------------------------------------------------------------
 */

const DOCTOR_CONFIG = {
  name: "Dr. Farhana Ahmed",
  credentials: "MBBS, FCPS (Medicine), MD (Cardiology)",
  specialty: "Consultant Cardiologist & Internal Medicine Specialist",
  degrees: ["MBBS (DMC)", "FCPS (Medicine)", "MD (Cardiology)", "Fellowship in Interventional Cardiology (India)"],
  experience: "14+ years",
  registration: "BM&DC Reg. No. A-58421",
  photo: "assets/images/doctor-photo.svg",
  bio: "Dr. Farhana Ahmed is a consultant cardiologist with over fourteen years of clinical experience in diagnosing and managing heart disease, hypertension and complex internal medicine cases. She trained at Dhaka Medical College and completed advanced fellowship training in interventional cardiology. Known for spending real time listening to patients, she focuses on preventive heart care, clear explanations, and long-term follow-up rather than rushed consultations.",
  specializations: [
    { title: "Heart Disease & Hypertension", desc: "Diagnosis and long-term management of coronary artery disease, heart failure and high blood pressure." },
    { title: "Preventive Cardiology", desc: "Risk assessment, lipid management and lifestyle-based prevention plans." },
    { title: "ECG & Echocardiography", desc: "In-chamber ECG and echo interpretation for faster diagnosis." },
    { title: "General & Internal Medicine", desc: "Diabetes, thyroid disorders and general adult medical care." }
  ],

  // ---- Contact ----
  phone: "+8801711223344",
  phoneDisplay: "01711-223344",
  whatsapp: "8801711223344",
  email: "dr.farhana.ahmed@example.com",
  facebook: "https://facebook.com/dr.farhana.cardio",
  youtube: "https://youtube.com/@dr.farhana.cardio",
  website: "https://drfarhanaahmed.example.com",

  // ---- Chambers (one doctor, can have multiple sitting locations) ----
  chambers: [
    {
      id: "chamber-1",
      name: "Green Life Heart Center",
      address: "House 12, Road 7, Dhanmondi, Dhaka 1205",
      mapsUrl: "https://maps.google.com/?q=Green+Life+Heart+Center+Dhanmondi+Dhaka",
      visitingDays: ["Saturday", "Sunday", "Tuesday", "Thursday"],
      visitingHours: "5:00 PM – 9:00 PM",
      slotMinutes: 15,
      maxPatientsPerDay: 16
    },
    {
      id: "chamber-2",
      name: "City Medical Chamber",
      address: "Level 4, Plot 22, Banani, Dhaka 1213",
      mapsUrl: "https://maps.google.com/?q=City+Medical+Chamber+Banani+Dhaka",
      visitingDays: ["Monday", "Wednesday"],
      visitingHours: "6:00 PM – 8:30 PM",
      slotMinutes: 15,
      maxPatientsPerDay: 10
    }
  ],

  // ---- Fees (BDT) ----
  fees: {
    newPatient: 1500,
    followUp: 800,
    followUpValidityDays: 15
  }
};

const APP_SETTINGS = {
  appointmentSlotMinutes: 15,
  followUpValidityDays: 15,
  currency: "৳",
  demoMode: true, // no real payment or backend is connected in this build
  featureFlags: {
    onlinePayment: true,
    fileUpload: true,
    familyMembers: true,
    notifications: true
  }
};

// Freeze so a page can't accidentally mutate shared config at runtime
Object.freeze(APP_SETTINGS.featureFlags);
