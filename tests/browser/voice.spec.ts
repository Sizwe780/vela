import { test, expect } from "@playwright/test";
import { mockSpeech } from "./helpers/speech";
test("voice is opt-in, previews dictation, speaks responses and stops on denial or cancellation", async ({
  page,
}, info) => {
  await mockSpeech(page);
  await page.goto("/study/demo");
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Learning companion", exact: true }).click();
  await page.getByRole("button", { name: "Voice options", exact: true }).click();
  const voice = page.getByRole("dialog", { name: "Voice tutor", exact: true });
  await expect(
    voice.getByRole("button", { name: "Start voice conversation", exact: true }),
  ).toBeDisabled();
  expect(await page.evaluate(() => (window as any).voiceQA.created)).toBe(0);
  await voice.getByLabel(/I understand browser dictation/).check();
  await voice.getByRole("button", { name: "Dictate a question", exact: true }).click();
  await expect(voice.getByText("Listening…", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const r = (window as any).voiceQA.current;
    r.onresult({ results: [{ isFinal: false, 0: { transcript: "Explain epsilon and delta" } }] });
  });
  await expect(voice.getByRole("textbox", { name: "Voice transcript", exact: true })).toHaveValue(
    "Explain epsilon and delta",
  );
  await expect(page.locator(".chat-message")).toHaveCount(0);
  await page.evaluate(() => {
    const r = (window as any).voiceQA.current;
    r.onresult({ results: [{ isFinal: true, 0: { transcript: "Explain epsilon and delta" } }] });
    r.onend();
  });
  await voice.getByLabel("Read responses aloud", { exact: true }).check();
  await voice.getByRole("button", { name: "Send transcript", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).voiceQA.spoken.length))
    .toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Stop response", exact: true })).toHaveCount(0);
  await voice.getByRole("button", { name: "Start voice conversation", exact: true }).click();
  const before = await page.evaluate(() => (window as any).voiceQA.started);
  await page.evaluate(() => {
    const r = (window as any).voiceQA.current;
    r.onresult({
      results: [{ isFinal: true, 0: { transcript: "Explain the derivative as a local rate" } }],
    });
    r.onend();
  });
  await expect(
    page.getByText("Explain the derivative as a local rate", { exact: true }),
  ).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => (window as any).voiceQA.started))
    .toBeGreaterThan(before);
  expect(await page.evaluate(() => (window as any).voiceQA.echoStarts)).toBe(0);
  await voice.getByRole("button", { name: "Close voice options", exact: true }).click();
  await page.getByRole("button", { name: "Stop voice", exact: true }).click();
  await expect(page.getByRole("button", { name: "Voice options", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  const count = await page.locator(".chat-message").count();
  await page.evaluate(() => {
    const r = (window as any).voiceQA.current;
    r.onresult?.({
      results: [{ isFinal: true, 0: { transcript: "This stale result must not send" } }],
    });
    r.onend?.();
  });
  await expect(page.locator(".chat-message")).toHaveCount(count);
  await page.getByRole("button", { name: "Voice options", exact: true }).click();
  await voice.getByRole("button", { name: "Dictate a question", exact: true }).click();
  await page.evaluate(() => (window as any).voiceQA.current.onerror({ error: "not-allowed" }));
  await expect(voice.getByText(/Microphone permission was denied/)).toBeVisible();
  await expect(voice.getByText("Microphone off", { exact: true })).toBeVisible();
  await page.screenshot({ path: `voice-controls-${info.project.name}.png` });
});
test("cancelling a pending microphone grant stops late tracks without starting a recorder", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    let grant: any;
    const state = {
      stops: 0,
      recorders: 0,
      grant: () => grant({ getTracks: () => [{ stop: () => state.stops++ }] }),
    };
    (window as any).micQA = state;
    Object.defineProperty(window, "SpeechRecognition", { configurable: true, value: undefined });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: () =>
          new Promise((resolve) => {
            grant = resolve;
          }),
      },
    });
    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: class {
        constructor() {
          state.recorders++;
        }
      },
    });
  });
  await page.goto("/study/demo");
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Learning companion", exact: true }).click();
  await page.getByRole("button", { name: "Voice options", exact: true }).click();
  const voice = page.getByRole("dialog", { name: "Voice tutor", exact: true });
  await voice.getByLabel(/I understand browser dictation/).check();
  await voice.getByRole("button", { name: "Record with Cloudflare · 30s", exact: true }).click();
  await expect(voice.getByRole("button", { name: "Stop all voice", exact: true })).toBeEnabled();
  await voice.getByRole("button", { name: "Stop all voice", exact: true }).click();
  await page.evaluate(() => (window as any).micQA.grant());
  await expect.poll(() => page.evaluate(() => (window as any).micQA.stops)).toBe(1);
  expect(await page.evaluate(() => (window as any).micQA.recorders)).toBe(0);
  await expect(voice.getByText("Microphone off", { exact: true })).toBeVisible();
});
