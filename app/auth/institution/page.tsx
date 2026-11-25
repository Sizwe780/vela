import { VelaLogo } from "../../../components/vela-logo";
import Link from "next/link";
import { prisma } from "../../../lib/db";
import { ssoAvailable } from "../../../lib/institution/access";
import { ssoProviders } from "../../../lib/institution/input";
import { InstitutionSignIn } from "../../../components/institution/sign-in";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Institution sign-in · Vela",
  robots: { index: false, follow: false },
};
export default async function InstitutionSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ institution?: string }>;
}) {
  const requested = (await searchParams).institution;
  const configurations = await prisma.institutionIntegration.findMany({
    where: { ssoEnabled: true, ...(requested ? { institution: requested.slice(0, 80) } : {}) },
    select: { institution: true, ssoProvider: true },
    orderBy: { institution: "asc" },
  });
  const options = configurations.flatMap((row) => {
    const provider = ssoProviders.find((item) => item === row.ssoProvider);
    return provider && ssoAvailable(provider) ? [{ institution: row.institution, provider }] : [];
  });
  return (
    <main id="main-content" className="auth-shell" tabIndex={-1}>
      <Link className="brand" href="/">
        <VelaLogo size={48} />
      </Link>
      <section className="auth-card">
        <h1>Institution sign-in</h1>
        {options.length ? (
          <InstitutionSignIn options={options} />
        ) : (
          <p>
            Institution sign-in is unavailable here. Sign in with your Vela account or ask your
            institution for help.
          </p>
        )}
        <div className="auth-links">
          <Link href="/auth/sign-in">Sign in with email</Link>
          <Link href="/help">Help</Link>
        </div>
      </section>
    </main>
  );
}
