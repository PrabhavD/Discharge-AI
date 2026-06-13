import { UserRole } from "@prisma/client";

export interface DevUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export const DEV_USERS: DevUser[] = [
  { id: "user-doctor-1", name: "Dr Sarah Mitchell", email: "s.mitchell@demo.nhs.uk", role: "DOCTOR" },
  { id: "user-nurse-1", name: "Nurse James Okonkwo", email: "j.okonkwo@demo.nhs.uk", role: "NURSE" },
  { id: "user-consultant-1", name: "Dr Ahmed Hassan", email: "a.hassan@demo.nhs.uk", role: "CONSULTANT" },
  { id: "user-pharmacist-1", name: "Pharmacist Emma Clarke", email: "e.clarke@demo.nhs.uk", role: "PHARMACIST" },
  { id: "user-coordinator-1", name: "Coordinator Lisa Park", email: "l.park@demo.nhs.uk", role: "DISCHARGE_COORDINATOR" },
  { id: "user-admin-1", name: "Admin User", email: "admin@demo.nhs.uk", role: "ADMIN" },
];

export function getDevUserById(id: string): DevUser | undefined {
  return DEV_USERS.find((u) => u.id === id);
}

export function getDevUserByEmail(email: string): DevUser | undefined {
  return DEV_USERS.find((u) => u.email === email);
}
