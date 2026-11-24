import { notFound } from "next/navigation";
import { AuthForm } from "../../../components/auth-form";
export const dynamic = "force-dynamic";

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>;
  searchParams: Promise<{ redirectTo?: string; token?: string }>;
}) {
  const { path } = await params;
  if (path !== "sign-in" && path !== "sign-up" && path !== "reset-password") notFound();
  const { redirectTo, token } = await searchParams;
  return <AuthForm path={path} redirectTo={redirectTo} token={token} />;
}
