import { redirect } from "next/navigation";
import { DEFAULT_WARD_ID } from "@/lib/constants";

export default function HomePage() {
  redirect(`/wards/${DEFAULT_WARD_ID}`);
}
