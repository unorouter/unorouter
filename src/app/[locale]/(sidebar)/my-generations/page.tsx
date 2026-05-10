import { redirect } from "next/navigation";

// /my-generations was folded into /generate (history sidebar rail). Server
// redirect keeps old links / bookmarks working without a 404.
export default function MyGenerationsRedirect() {
  redirect("/generate");
}
