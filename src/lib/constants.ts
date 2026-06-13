export const DEFAULT_WARD_ID = "4A";
export const DEFAULT_WARD_NAME = "Ward 4A — General Medicine";

export const SESSION_COOKIE = "discharge-ai-session";

export const DOMAIN_LABELS: Record<string, string> = {
  MEDICAL_READINESS: "Medical readiness",
  MEDICINES: "Medicines",
  THERAPY_AND_MOBILITY: "Therapy & mobility",
  HOME_AND_CARE: "Home & care",
  TRANSPORT: "Transport",
  FAMILY_COMMUNICATION: "Family communication",
  DOCUMENTATION: "Documentation",
  FOLLOW_UP: "Follow-up",
};

export const STATUS_LABELS: Record<string, string> = {
  GREEN: "Complete",
  AMBER: "In progress",
  RED: "Blocker",
  GREY: "Not started",
  BLUE: "N/A",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
  NOT_APPLICABLE: "N/A",
};

export const ROLE_LABELS: Record<string, string> = {
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  CONSULTANT: "Consultant",
  PHARMACIST: "Pharmacist",
  PHYSIOTHERAPIST: "Physiotherapist",
  OCCUPATIONAL_THERAPIST: "Occupational therapist",
  DISCHARGE_COORDINATOR: "Discharge coordinator",
  BED_MANAGER: "Bed manager",
  ADMIN: "Admin",
  READ_ONLY: "Read only",
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  DISCHARGE_SUMMARY: "Discharge summary",
  GP_HANDOVER: "GP handover",
  PATIENT_ADVICE: "Patient advice",
  MEDICATION_COUNSELLING: "Medication counselling",
  OUTSTANDING_RESULTS: "Outstanding results",
  FOLLOW_UP_PLAN: "Follow-up plan",
};
