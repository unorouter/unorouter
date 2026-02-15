import { redirect } from "next/navigation";
import { LOCALES } from "@/lib/config/constants";

export default function RootPage() {
  redirect(`/${LOCALES[0]}`);
}
