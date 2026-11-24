import { notFound } from "next/navigation";
import { EditorialPage } from "../../../../components/teaching/editorial-page";
export const dynamic = "force-dynamic";
export const metadata = { title: "Module editorial review · Vela", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ module: string }> }) {
  const code = (await params).module.toUpperCase();
  if (!/^[A-Z0-9-]{2,40}$/.test(code)) notFound();
  return <EditorialPage moduleCode={code} />;
}
