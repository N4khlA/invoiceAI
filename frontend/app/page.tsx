import { redirect } from "next/navigation";

export default function HomePage() {
  // Root "/" immediately redirects to login
  redirect("/login");
}
