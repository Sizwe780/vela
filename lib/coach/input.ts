import { IngestError } from "../ingest/errors";
import type { z } from "zod";
export function coachInput<T>(schema: z.ZodType<T>, value: unknown) {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new IngestError(
      400,
      "INVALID_COACH_INPUT",
      "Check the session, steps and supported fields before trying again.",
    );
  return parsed.data;
}
export function checkedImage(data: string) {
  const [header, encoded] = data.split(",");
  const bytes = Buffer.from(encoded ?? "", "base64");
  const valid =
    header === "data:image/jpeg;base64"
      ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : header === "data:image/png;base64"
        ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : header === "data:image/webp;base64"
          ? bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP"
          : false;
  if (!valid || bytes.length < 24 || bytes.length > 1_300_000)
    throw new IngestError(
      400,
      "IMAGE_FORMAT",
      "Use a cropped JPEG, PNG or WebP image under 1.3 MB.",
    );
  return data;
}
