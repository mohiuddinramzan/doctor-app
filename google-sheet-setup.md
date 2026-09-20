# Google Sheet-এ বুকিং জমা করার সেটআপ (ধাপে ধাপে)

## ধাপ ১: নতুন Google Sheet বানান
1. https://sheets.google.com এ যান, নতুন একটা spreadsheet খুলুন।
2. প্রথম রো (headers) এ এগুলো লিখুন, প্রতিটা আলাদা কলামে:

```
Timestamp | ID | Name | Phone | Type | Chamber | Date | Time | Notes | Status
```

## ধাপ ২: Apps Script খুলুন
1. শিটের উপরে মেনু থেকে **Extensions → Apps Script** এ ক্লিক করুন।
2. যা কিছু আগে থেকে লেখা আছে (`function myFunction() {}`) সব মুছে ফেলুন।
3. নিচের কোডটা পুরোপুরি কপি করে পেস্ট করুন:

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var params = e.parameter;

  if (params.action === "cancel") {
    // বাতিল করা হলে ID মিলিয়ে Status আপডেট করা
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === params.id) {
        sheet.getRange(i + 1, 10).setValue("বাতিল");
        break;
      }
    }
  } else {
    // নতুন বুকিং হলে নতুন রো যোগ করা
    sheet.appendRow([
      new Date(),
      params.id || "",
      params.name || "",
      params.phone || "",
      params.type || "",
      params.chamber || "",
      params.date || "",
      params.time || "",
      params.notes || "",
      params.status || "নিশ্চিত"
    ]);
  }

  return ContentService.createTextOutput("OK");
}
```

4. উপরে ডিস্ক আইকনে ক্লিক করে সেভ করুন (প্রজেক্টের একটা নাম দিতে বলবে, যেকোনো নাম দিন)।

## ধাপ ৩: ওয়েব অ্যাপ হিসেবে ডিপ্লয় করুন
1. উপরে ডানদিকে **Deploy → New deployment** এ ক্লিক করুন।
2. গিয়ার আইকনে ক্লিক করে **Web app** সিলেক্ট করুন।
3. এই সেটিংস দিন:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. **Deploy** বাটনে ক্লিক করুন। প্রথমবার হলে Google আপনার অনুমতি (permission) চাইবে — Authorize করুন।
5. ডিপ্লয় হয়ে গেলে একটা **Web app URL** পাবেন, যেমন:
   `https://script.google.com/macros/s/AKfycb.../exec`
   এই URL টা কপি করুন।

## ধাপ ৪: অ্যাপে URL বসান
`js/app.js` ফাইল খুলুন, একদম উপরের দিকে এই লাইনটা খুঁজুন:

```javascript
const SHEET_WEBHOOK_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";
```

`"PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE"` এর জায়গায় আপনার কপি করা URL বসান:

```javascript
const SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycb.../exec";
```

সেভ করুন, `git add . && git commit -m "connect google sheet" && git push` করে আপলোড করুন।

## ব্যাস, শেষ!
এখন থেকে কেউ অ্যাপয়েন্টমেন্ট বুক করলেই সেটা আপনার Google Sheet-এ একটা নতুন রো হিসেবে যোগ হয়ে যাবে — আপনি (বা যে কেউ ম্যানেজ করবে) শিট খুললেই সব বুকিং একসাথে দেখতে পারবেন, ফোন থেকেও (Google Sheets অ্যাপ দিয়ে)।

**নোট:** যদি ভবিষ্যতে Apps Script কোড বদলান, তাহলে আবার নতুন করে Deploy → **Manage deployments → Edit → New version** করে ডিপ্লয় করতে হবে, নাহলে পুরনো কোডই চলবে।
