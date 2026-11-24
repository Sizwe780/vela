// Optional Cloudflare scheduled trigger for a PUBLIC HTTPS deployment of Vela.
// Keep the local worker instead while EMAIL_APP_URL is localhost.
export default {
  async scheduled(_event: unknown, env: { VELA_ORIGIN: string; EMAIL_JOB_SECRET: string }) {
    const url = new URL(env.VELA_ORIGIN);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      throw Error("Set a public Vela HTTPS origin");
    const response = await fetch(`${url.origin}/api/jobs/email`, {
      method: "POST",
      redirect: "error",
      headers: { Authorization: `Bearer ${env.EMAIL_JOB_SECRET}` },
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw Error(`Email job returned HTTP ${response.status}`);
  },
};
