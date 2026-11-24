import { Pool } from "pg";
import { attachDatabasePool } from "@neon/functions";
import { createRemoteJWKSet, jwtVerify } from "jose";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 10_000 });
attachDatabasePool(pool);
const jwks = createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL!));
const issuer = new URL(process.env.NEON_AUTH_BASE_URL!).origin;

export default {
  async fetch(request: Request): Promise<Response> {
    const bearer = request.headers.get("authorization");
    if (!bearer?.startsWith("Bearer ")) return Response.json({ error: "Unauthorized" }, { status: 401 });
    let userId: string;
    try {
      const { payload } = await jwtVerify(bearer.slice(7), jwks, { issuer });
      if (!payload.sub) return Response.json({ error: "Unauthorized" }, { status: 401 });
      userId = payload.sub;
    } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
    if (request.method !== "GET") return Response.json({ error: "Method not allowed" }, { status: 405 });
    const { rows } = await pool.query<{ modules: number; studyUnits: number }>('SELECT (SELECT count(*)::int FROM "Module") AS modules, (SELECT count(*)::int FROM "StudyUnit") AS "studyUnits"');
    return Response.json({ service: "neon-functions", userId, catalog: rows[0] }, { headers: { "Cache-Control": "private, no-store" } });
  },
};
