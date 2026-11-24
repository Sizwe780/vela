import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { byteRange, sourcePdf } from "../lib/study/pdf-source";

test("PDF range parsing handles normal/suffix ranges and rejects traversal-like or unsatisfiable inputs", () => {
  assert.deepEqual(byteRange("bytes=0-4", 10), { start: 0, end: 4, partial: true });
  assert.deepEqual(byteRange("bytes=7-", 10), { start: 7, end: 9, partial: true });
  assert.deepEqual(byteRange("bytes=-3", 10), { start: 7, end: 9, partial: true });
  for (const input of ["bytes=11-12", "bytes=8-2", "bytes=-0", "bytes=0-1,5-6", "bytes=99999999999999999999-"]) assert.equal(byteRange(input, 10), null);
});

test("original PDFs stream the requested bytes, protect exact source versions and whitelist filenames", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lms-pdf-source-"));
  const original = process.env.MAT1512_SOURCE_DIR;
  process.env.MAT1512_SOURCE_DIR = directory;
  const data = Buffer.from("%PDF-1.7\nfixture-source", "utf8");
  const sha = createHash("sha256").update(data).digest("hex");
  try {
    await writeFile(join(directory, "Mat1512-guide.pdf"), data);
    const response = await sourcePdf("guide", new Request(`http://localhost/api/sources/guide?sha=${sha}`, { headers: { Range: "bytes=0-7" } }));
    assert.equal(response.status, 206); assert.equal(response.headers.get("content-range"), `bytes 0-7/${data.length}`);
    assert.equal(await response.text(), "%PDF-1.7");
    assert.equal((await sourcePdf("../private", new Request("http://localhost"))).status, 404);
    assert.equal((await sourcePdf("constructor", new Request("http://localhost"))).status, 404);
    assert.equal((await sourcePdf("guide", new Request("http://localhost?sha=wrong"))).status, 409);
    assert.equal((await sourcePdf("guide", new Request("http://localhost", { headers: { Range: "bytes=999-" } }))).status, 416);
    assert.equal(await (await sourcePdf("guide", new Request("http://localhost", { method: "HEAD" }))).text(), "");
  } finally {
    if (original === undefined) delete process.env.MAT1512_SOURCE_DIR; else process.env.MAT1512_SOURCE_DIR = original;
    // Exact, newly created fixture directory; contains only this test's PDF.
    await rm(join(directory, "Mat1512-guide.pdf")); await rmdir(directory);
  }
});
