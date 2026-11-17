import { redirect } from "next/navigation";

// Guests land on their ticket; admins use the snow globe (top right).
export default function Home() {
  redirect("/my-ticket");
}
