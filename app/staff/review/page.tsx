import { EditorialPage } from "../../../components/teaching/editorial-page";
export const dynamic = "force-dynamic";
export const metadata = { title: "Editorial review · Vela", robots: { index: false } };

export default async function Page() {
  return <EditorialPage />;
}
