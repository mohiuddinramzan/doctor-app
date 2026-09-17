# Dr. Farhana Ahmed — Personal Doctor Appointment & Patient Management App

A complete, static, frontend-only appointment booking and patient management web
application built for **one doctor's personal practice** — not a multi-doctor
marketplace. Built with plain HTML5, CSS3 and vanilla JavaScript (ES6+), so it
runs anywhere without a build step, including GitHub Pages.

> ⚠️ **This is a frontend demo.** All data lives in the browser's
> `localStorage`. Payments, file storage and authentication are mocked. See
> [Moving to production](#moving-to-production) before using this for real
> patients.

## Features

- **Landing page** — doctor profile, fees, chamber info, contact buttons, FAQ
- **8-step booking flow** — patient type → chamber → date → time/serial →
  patient details + file upload → fee breakdown → mock payment (bKash / Nagad /
  Card / Other) → confirmation with QR code, download, print and
  add-to-calendar (.ics)
- **Live serial/queue tracker** — "your serial", "current serial", "patients
  ahead", with cancel and reschedule
- **Patient dashboard** — profile, upcoming/previous appointments,
  prescriptions, reports, payment history, family members
- **Doctor dashboard** (demo sign-in from the Doctor Profile page) — today's
  stats, appointment table with call/complete/cancel actions, a **Next
  Patient** button that advances the queue, weekly schedule view, and
  leave-day management
- **Digital prescriptions** — multi-medicine prescription builder with
  print/download, and a read-only patient view
- **Medical reports** — upload (demo, stored as base64 in `localStorage`),
  category filters, preview, delete, download
- **Notification center** — bell icon with unread badge, shared across pages
- **Fully responsive** — bottom navigation and sticky booking bar on mobile,
  sidebar dashboard navigation on desktop

## Folder structure

```
/
├── index.html            Landing page
├── doctor.html           Public doctor profile + doctor dashboard (demo login)
├── booking.html          8-step appointment booking flow
├── appointments.html     Patient-facing lookup + live queue tracker
├── patient.html          Patient dashboard (profile, history, family, etc.)
├── prescription.html     Prescription creation (doctor) & viewing (patient)
├── reports.html          Medical report upload/preview/delete
├── css/
│   ├── style.css         Design tokens, typography, layout, header/footer
│   ├── components.css    Buttons, cards, forms, tables, modals, stepper…
│   └── responsive.css    Mobile bottom nav, sticky CTA, breakpoints
├── js/
│   ├── config.js         DOCTOR_CONFIG — single source of truth
│   ├── data.js           localStorage data layer + demo data seeding
│   ├── paymentService.js Mock payment abstraction (initialize/verify/status)
│   ├── app.js             Shared nav, toasts, contact links, notifications, FAQ
│   ├── booking.js        Booking flow state machine
│   ├── doctor.js         Doctor dashboard logic
│   ├── patient.js        Patient dashboard logic
│   ├── appointments.js   Appointment lookup + queue widget
│   ├── prescription.js   Prescription create/view logic
│   └── reports.js        Reports upload/preview/delete logic
├── assets/images/        SVG doctor portrait placeholder
├── .github/workflows/deploy.yml   GitHub Pages deployment
└── README.md
```

## Running locally

No build tools or dependencies are required.

```bash
# any static file server works, for example:
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080` (or the port shown) in your browser.

## Demo data & logins

- Demo patients: `PT-1001` – `PT-1005` (or their phone numbers, e.g.
  `01812345001`)
- Doctor dashboard: open **Doctor Profile → Doctor Login**, enter any 4+ digit
  PIN (demo auth only, not secure)
- All demo records are tagged `isDemo: true` in `localStorage` so they're easy
  to distinguish from anything a real user adds during testing

## Configuring the app

Everything specific to the doctor's practice lives in **`js/config.js`**:

- `DOCTOR_CONFIG.name`, `.specialty`, `.degrees`, `.bio`, `.photo`
- `DOCTOR_CONFIG.phone`, `.whatsapp`, `.email`, `.facebook`, `.youtube`,
  `.website` — used to build every contact button automatically
- `DOCTOR_CONFIG.chambers` — array of chamber objects (name, address, maps
  URL, visiting days, hours, slot length, max patients/day). Add a second or
  third chamber by adding another object to this array.
- `DOCTOR_CONFIG.fees` — `newPatient`, `followUp`, `followUpValidityDays`
- `APP_SETTINGS` in the same file — slot length, currency symbol, feature
  flags

No other file should need to change when the doctor's information, fees or
schedule change.

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. In **Settings → Pages**, set the source to **GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) will build and
   deploy on every push to `main`. No build step is required since the site
   is already static.

## Moving to production

This project is a **frontend prototype**. Before using it with real patients,
a production deployment must add:

- A secure backend (API) instead of writing directly to `localStorage`
- Real authentication and authorization (the "Doctor Login" here is a demo
  PIN with no security)
- A real database (Postgres, MySQL, Firestore, etc.)
- Encrypted communication (HTTPS everywhere, encrypted data at rest)
- Secure, access-controlled file storage for reports and prescriptions
  instead of base64 strings in `localStorage`
- A real payment gateway integration. `js/paymentService.js` already isolates
  this logic — replace `initializePayment()` and `verifyPayment()` with calls
  to your backend, which talks to the provider's server-side API. **Never**
  put a provider secret key in frontend JavaScript.
- Audit logging of who accessed or changed patient data
- Privacy/consent controls appropriate to your jurisdiction's health-data
  regulations

**Do not store real patient medical information in this demo application.**

## License

Provided as-is for demonstration purposes.
