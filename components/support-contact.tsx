import Link from "next/link";
import { supportEmail } from "../lib/site";
export function SupportContact() {
  return supportEmail ? (
    <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
  ) : (
    <Link href="/help#contact">contact Vela through Help</Link>
  );
}
