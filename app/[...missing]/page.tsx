import { notFound } from "next/navigation";
// Route unmatched URLs through the App Router boundary consistently in production.
export default function MissingPage() {
  notFound();
}
