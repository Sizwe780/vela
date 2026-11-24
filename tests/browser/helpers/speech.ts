export async function mockSpeech(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const state = {
      created: 0,
      started: 0,
      aborted: 0,
      spoken: [] as string[],
      speaking: false,
      echoStarts: 0,
      current: null as any,
    };
    (window as any).voiceQA = state;
    class Recognition {
      lang = "";
      continuous = false;
      interimResults = false;
      onresult: any;
      onerror: any;
      onend: any;
      constructor() {
        state.created++;
        state.current = this;
      }
      start() {
        state.started++;
        if (state.speaking) state.echoStarts++;
      }
      stop() {
        this.onend?.();
      }
      abort() {
        state.aborted++;
      }
    }
    Object.defineProperty(window, "SpeechRecognition", { configurable: true, value: Recognition });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => [],
        cancel() {
          state.speaking = false;
        },
        speak(u: SpeechSynthesisUtterance) {
          state.spoken.push(u.text);
          state.speaking = true;
          setTimeout(() => {
            u.onstart?.(new Event("start") as SpeechSynthesisEvent);
            setTimeout(() => {
              state.speaking = false;
              u.onend?.(new Event("end") as SpeechSynthesisEvent);
            }, 20);
          }, 0);
        },
      },
    });
  });
}
