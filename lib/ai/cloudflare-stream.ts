// Workers AI sometimes serializes numeric or boolean text tokens as JSON scalars.
// Normalize only that wire-format difference; preserve errors and all other data.
export function normalizeCloudflareStream(response: Response): Response {
  if (
    !response.body ||
    !response.ok ||
    !response.headers.get("content-type")?.includes("text/event-stream")
  )
    return response;
  let buffered = "";
  function event(source: string) {
    const lines = source.split(/\r?\n/);
    const data = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") return source;
    try {
      const value = JSON.parse(data);
      let changed = false;
      for (const choice of Array.isArray(value?.choices) ? value.choices : []) {
        if (
          (typeof choice?.delta?.content === "number" && Number.isFinite(choice.delta.content)) ||
          typeof choice?.delta?.content === "boolean"
        ) {
          choice.delta.content = String(choice.delta.content);
          changed = true;
        }
      }
      if (!changed) return source;
      let written = false;
      return lines
        .flatMap((line) => {
          if (!line.startsWith("data:")) return [line];
          if (written) return [];
          written = true;
          return [`data: ${JSON.stringify(value)}`];
        })
        .join("\n");
    } catch {
      return source;
    }
  }
  const body = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(
      new TransformStream<string, string>({
        transform(text, controller) {
          buffered += text;
          let boundary: RegExpMatchArray | null;
          while ((boundary = buffered.match(/\r?\n\r?\n/)) && boundary.index !== undefined) {
            controller.enqueue(`${event(buffered.slice(0, boundary.index))}\n\n`);
            buffered = buffered.slice(boundary.index + boundary[0].length);
          }
          if (buffered.length > 65_536)
            throw new Error("AI stream event exceeds the supported size");
        },
        flush(controller) {
          if (buffered) controller.enqueue(`${event(buffered)}\n\n`);
        },
      }),
    )
    .pipeThrough(new TextEncoderStream());
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}
