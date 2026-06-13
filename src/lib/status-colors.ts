import { DomainStatus } from "@prisma/client";

export function statusColorClass(status: DomainStatus | string): string {
  switch (status) {
    case "GREEN":
      return "bg-emerald-100 text-emerald-900 border-emerald-300";
    case "AMBER":
      return "bg-amber-100 text-amber-900 border-amber-300";
    case "RED":
      return "bg-red-100 text-red-900 border-red-300";
    case "BLUE":
      return "bg-slate-100 text-slate-600 border-slate-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
}

export function statusDotClass(status: DomainStatus | string): string {
  switch (status) {
    case "GREEN":
      return "bg-emerald-500";
    case "AMBER":
      return "bg-amber-500";
    case "RED":
      return "bg-red-500";
    case "BLUE":
      return "bg-slate-400";
    default:
      return "bg-gray-400";
  }
}
