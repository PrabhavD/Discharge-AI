/** Fictional mock EPR extracted from Patient EPR Record.docx — no real PHI. */

export const ARTHUR_MOCKWELL = {
  nhsNumber: "9990001011",
  hospitalNumber: "H011",
  firstName: "Arthur",
  lastName: "Mockwell",
  dateOfBirth: new Date("1940-03-12"),
  sex: "Male",
  address: "42 Oak Lane, Riverside, RS3 7PQ",
};

export const ARTHUR_ENCOUNTER = {
  id: "enc-H011",
  ward: "4A",
  bed: "11",
  specialty: "General Surgery",
  consultantName: "Mr R. Marks",
  admissionDate: new Date("2026-01-01T15:00:00Z"),
  expectedDischargeDate: new Date("2026-01-04T12:00:00Z"),
};

export const ARTHUR_SNAPSHOT_ID = "snap-H011";

export const ARTHUR_CLINICAL_SNAPSHOT = {
  diagnoses: [
    "Ruptured acute cholecystitis (post open cholecystectomy)",
    "Incidental 13mm right renal mass under investigation",
  ],
  problemList: [
    "Biliary colic",
    "Hypertension",
    "CKD stage 3",
    "Type 2 diabetes mellitus",
    "Atrial fibrillation",
    "Bilateral total knee replacements",
    "Cataracts",
    "Anxiety",
  ],
  observations: [
    { type: "BP", value: "110/63", date: "2026-01-02T04:00:00Z" },
    { type: "HR", value: "99", date: "2026-01-02T04:00:00Z" },
    { type: "O2", value: "98% RA", date: "2026-01-02T04:00:00Z" },
  ],
  news2Score: 2,
  bloodResults: [
    { test: "Hb", value: "102", unit: "g/L", date: "2026-01-01T18:45:00Z", note: "On admission" },
    { test: "Hb", value: "85", unit: "g/L", date: "2026-01-01T21:30:00Z", note: "Post-op blood gas" },
    { test: "Hb", value: "82", unit: "g/L", date: "2026-01-02T13:10:00Z", note: "Improving trend" },
    { test: "WCC", value: "25", unit: "×10⁹/L", date: "2026-01-01T18:45:00Z", note: "Elevated" },
    { test: "CRP", value: "173", unit: "mg/L", date: "2026-01-01T18:45:00Z", note: "Elevated" },
    { test: "CRP", value: "Improving", unit: "", date: "2026-01-02T13:10:00Z", note: "Trending down with WCC" },
    { test: "eGFR", value: "34", unit: "mL/min", date: "2026-01-01T18:45:00Z", note: "CKD3 baseline" },
  ],
  imagingReports: [
    {
      modality: "CT Abdomen and Pelvis with contrast",
      date: "2026-01-01T17:45:00Z",
      author: "Dr P. Low (SpR Radiology)",
      conclusion:
        "Acute cholecystitis with appearances of early contained rupture — urgent discussion with general surgery recommended. 13mm exophytic mass within right kidney suspicious of malignancy — follow-up CT Renal +/- biopsy and urology discussion recommended.",
    },
    {
      modality: "CT Angiogram Abdomen and Pelvis",
      date: "2026-01-01T22:00:00Z",
      author: "Dr P. Low (SpR Radiology)",
      conclusion:
        "Appearances in keeping with post-operative haematoma; no demonstrable active extravasation. Right renal upper pole exophytic mass again noted — stable.",
    },
  ],
  currentMedications: [
    { name: "Metformin", dose: "500mg BD" },
    { name: "Amlodipine", dose: "5mg OD" },
    { name: "Bisoprolol", dose: "2.5mg OD" },
    { name: "Paracetamol", dose: "1g QDS PRN" },
    { name: "Vitamin D", dose: "800 units OD" },
  ],
  allergies: ["Lorazepam"],
  therapyNotes: [
    "2 Jan 11:30 PT (E. Ellen): Patient able to stand with assistance; few steps; would likely require twice daily carers short term.",
    "3 Jan 11:30 PT (E. Ellen): Patient mobilising without assistance; attending own toileting; better spirits; can continue PT/OT until discharge.",
  ],
  nursingNotes: [
    "1 Jan 17:30: Cannula inserted, medications started. NOK daughter Lucy informed — lives 3 hours away.",
    "2 Jan 13:00: District nurses rang — can only start package of care 3 days from now; patient technically out of catchment area.",
    "2 Jan 17:10: Patient MFFD; mobilising independently; observations stable.",
  ],
  socialHistory: {
    livesAlone: true,
    nok: "Lucy (daughter)",
    wifeDeceased: true,
    daughterDistance: "3 hours away",
    daughterPrefersExtraInpatientDays: true,
  },
  safeguardingFlags: [],
  frailtyScore: "Frail",
  capacityConcerns: ["Capacity concerns during acute illness — consent form 4 used for emergency surgery"],
  pendingInvestigations: [
    "CT Renal and/or biopsy for 13mm right renal mass — urology follow-up",
  ],
  existingReferrals: ["Urology — incidental renal mass"],
};

export type EprNoteEntry = {
  timestamp: string;
  author: string;
  role: string;
  text: string;
};

export const ARTHUR_EPR_NOTES: EprNoteEntry[] = [
  { timestamp: "2026-01-01T15:00:00Z", author: "S. Edwards", role: "Ambulance", text: "85 year old male with abdominal pain. Patient found in bed unkempt, delirious, clutching abdomen. Pale and clammy. BP 98/86, HR 104, O2 95%, GCS 14/15." },
  { timestamp: "2026-01-01T16:30:00Z", author: "F. Green", role: "Nursing", text: "Handover from ambulance. Majors bed 15. Confused and unwell. BP 88/62, HR 110, O2 94%, GCS 14/15. Nasal specs 2L O2. Unable to provide NOK details. Clinical concern escalated to doctor." },
  { timestamp: "2026-01-01T17:00:00Z", author: "Dr S. Mitchell", role: "Clinical (SHO)", text: "PMH: biliary colic, HTN, CKD3, T2DM, AF, bilateral TKR, cataracts, anxiety. Abdomen tender RUQ with guarding, Murphy positive. Imp: acute cholecystitis. Plan: IV fluids, IV antibiotics, CT abdomen, general surgery review, NBM." },
  { timestamp: "2026-01-01T17:45:00Z", author: "Dr P. Low", role: "Radiology (SpR)", text: "CT Abdomen/Pelvis: acute cholecystitis with early contained rupture. 13mm exophytic right renal mass concerning for malignancy — urology follow-up recommended." },
  { timestamp: "2026-01-01T18:45:00Z", author: "Dr Rizwan", role: "General Surgery (ST5)", text: "Bloods: Hb 102, WCC 25, CRP 173, eGFR 34. CT: ruptured acute cholecystitis + possible renal malignancy. Plan: admit, discuss theatre overnight vs morning, G&S + cross-match 2 units, consent form 4." },
  { timestamp: "2026-01-01T19:30:00Z", author: "Dr R. Marks", role: "Operative (Consultant)", text: "Laparoscopic converted to open laparotomy. Gallbladder removed, washout performed. ~200ml blood loss. Small necrotic-appearing right kidney mass noted. No intra-op complications." },
  { timestamp: "2026-01-01T22:00:00Z", author: "Dr P. Low", role: "Radiology (SpR)", text: "CT Angiogram: post-operative haematoma, no active extravasation. Renal mass stable." },
  { timestamp: "2026-01-02T09:30:00Z", author: "P. Rai", role: "Clinical (FY1)", text: "Ward round with Mr R. Marks. Daughter Lucy present. Patient orientated, comfortable, hungry. MFFD if bloods trending down. Lucy concerned patient cannot manage alone — wife recently deceased. Plan: await bloods, initiate package of care, gradual PT/OT." },
  { timestamp: "2026-01-02T13:00:00Z", author: "W. Pauls", role: "Nursing", text: "District nurses rang — can only start package of care 3 days from now as patient out of catchment area. Bloods escalated to clinician." },
  { timestamp: "2026-01-02T14:00:00Z", author: "P. Rai", role: "Clinical (FY1)", text: "Ward round: bloods and obs stable. MFFD. Continue PT/OT and chase POC. Daughter prefers father stay few more days." },
  { timestamp: "2026-01-02T16:00:00Z", author: "J. Edgar", role: "Pharmacy", text: "Medications reconciled. Diazepam removed from discharge list — note to GP for review if further prescription needed." },
  { timestamp: "2026-01-03T09:00:00Z", author: "P. Rai", role: "Clinical (FY1)", text: "Ward round: obs stable. Patient wants to go home but awaiting package of care. MFFD, continue PT/OT and chase POC." },
  { timestamp: "2026-01-03T11:30:00Z", author: "E. Ellen", role: "Physiotherapy", text: "Patient mobilising without assistance. Attended own toileting. Better spirits. Can continue PT/OT until discharge." },
];

export const ARTHUR_RAW_PAYLOAD = {
  source: "Patient EPR Record.docx (fictional mock)",
  notes: ARTHUR_EPR_NOTES,
};

export const ARTHUR_FREE_TEXT_NOTE =
  "District nurses rang — can only start package of care 3 days from now as patient is technically out of catchment area. Daughter Lucy lives 3 hours away; patient lives alone since wife passed away.";

export const ARTHUR_SOURCE_EVIDENCE = [
  {
    id: "ev-H011-ct",
    label: "CT Abdomen and Pelvis",
    excerpt: "Acute cholecystitis with early contained rupture; 13mm right renal mass suspicious of malignancy — urology follow-up recommended.",
  },
  {
    id: "ev-H011-op",
    label: "Operative note",
    excerpt: "Open cholecystectomy after laparoscopic conversion. Abdominal washout. Small necrotic-appearing right kidney mass noted intra-operatively.",
  },
  {
    id: "ev-H011-mffd",
    label: "Ward round — MFFD",
    excerpt: "2 Jan ward round: bloods and observations stable. Medically fit for discharge. Package of care and PT/OT to continue.",
  },
  {
    id: "ev-H011-pharmacy",
    label: "Pharmacy reconciliation",
    excerpt: "Medications reconciled. Diazepam removed from discharge list with GP review note.",
  },
];

export const ARTHUR_BLOCKER = {
  id: "blk-H011",
  domain: "HOME_AND_CARE" as const,
  title: "Care package not confirmed — district nurses 3-day delay",
  description:
    "District nurses can only start package of care in 3 days — patient out of catchment area. Discharge coordinator to confirm POC restart.",
  severity: "HIGH" as const,
  ownerRole: "DISCHARGE_COORDINATOR" as const,
};
