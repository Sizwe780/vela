import "server-only";
import { redirect } from "next/navigation";
import { auth } from "../auth/server";
export async function requireStudentPage(path: string) {
  const { data } = await auth.getSession();
  if (!data?.user) redirect(`/auth/sign-in?redirectTo=${encodeURIComponent(path)}`);
  return data.user;
}
