"use client";
import { useEffect, useRef, useState } from "react";
import {
  speechText,
  speechSegments,
  type Recognition,
  type SpeechWindow,
} from "../../lib/voice/speech";
export function useVoiceTutor({
  answer,
  busy,
  onTranscript,
  studyUnitId,
}: {
  answer: string;
  busy: boolean;
  onTranscript: (text: string) => void | Promise<void>;
  studyUnitId: string;
}) {
  const [supported, setSupported] = useState(false),
    [listening, setListening] = useState(false),
    [speaking, setSpeaking] = useState(false),
    [pending, setPending] = useState(false),
    [draft, setDraft] = useState(""),
    [notice, setNotice] = useState(""),
    [speak, setSpeak] = useState(false),
    [handsFree, setHandsFree] = useState(false);
  const speech = useRef<Recognition | null>(null),
    recorder = useRef<MediaRecorder | null>(null),
    media = useRef<MediaStream | null>(null),
    controller = useRef<AbortController | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    resume = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true),
    sendRef = useRef(onTranscript),
    busyRef = useRef(busy),
    handsRef = useRef(false),
    waiting = useRef(false),
    queue = useRef(0),
    generation = useRef(0),
    microphoneGeneration = useRef(0),
    cursor = useRef(0),
    lastText = useRef("");
  sendRef.current = onTranscript;
  busyRef.current = busy;
  handsRef.current = handsFree;
  const resumeRef = useRef<() => void>(() => {});
  function cancelSpeech() {
    generation.current++;
    window.speechSynthesis?.cancel();
    queue.current = 0;
    setSpeaking(false);
  }
  function stop() {
    microphoneGeneration.current++;
    handsRef.current = false;
    setHandsFree(false);
    waiting.current = false;
    if (resume.current) clearTimeout(resume.current);
    if (timer.current) clearTimeout(timer.current);
    if (speech.current) {
      speech.current.onend = null;
      speech.current.abort();
      speech.current = null;
    }
    if (recorder.current?.state === "recording") {
      recorder.current.onstop = null;
      recorder.current.stop();
    }
    media.current?.getTracks().forEach((t) => t.stop());
    controller.current?.abort();
    setListening(false);
    setPending(false);
    cancelSpeech();
  }
  async function send(text: string) {
    if (!text.trim() || busyRef.current) return;
    waiting.current = true;
    setDraft("");
    try {
      await sendRef.current(text.trim().slice(0, 4000));
    } catch {
      setNotice("The tutor could not answer. Your spoken question was preserved.");
      setDraft(text);
      setHandsFree(false);
      handsRef.current = false;
    } finally {
      waiting.current = false;
      resumeRef.current();
    }
  }
  function startRecognition(automatic = false) {
    if (busyRef.current || document.hidden) return;
    const C =
      (window as SpeechWindow).SpeechRecognition ??
      (window as SpeechWindow).webkitSpeechRecognition;
    if (!C) {
      setNotice(
        "Browser dictation is unavailable. Use a short Cloudflare recording or type instead.",
      );
      return;
    }
    cancelSpeech();
    if (speech.current) {
      speech.current.onend = null;
      speech.current.abort();
    }
    setNotice("");
    setDraft("");
    let final = "",
      partial = "",
      failed = false;
    const r = new C();
    speech.current = r;
    r.lang = "en-ZA";
    r.continuous = false;
    r.interimResults = true;
    r.onresult = (event) => {
      if (!alive.current || speech.current !== r) return;
      final = "";
      partial = "";
      for (let i = 0; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) final += item[0].transcript + " ";
        else partial += item[0].transcript + " ";
      }
      setDraft((final + partial).trim().slice(0, 4000));
    };
    r.onerror = (event) => {
      if (!alive.current || speech.current !== r) return;
      failed = true;
      if (timer.current) clearTimeout(timer.current);
      speech.current = null;
      r.onend = null;
      setListening(false);
      r.abort();
      handsRef.current = false;
      setHandsFree(false);
      setNotice(
        event.error === "not-allowed"
          ? "Microphone permission was denied. You can still type your question."
          : `Dictation stopped (${event.error}). Review the transcript or try again.`,
      );
    };
    r.onend = () => {
      if (timer.current) clearTimeout(timer.current);
      speech.current = null;
      if (!alive.current) return;
      setListening(false);
      if (automatic && handsRef.current && !failed && final.trim()) void send(final);
      else if (automatic) {
        handsRef.current = false;
        setHandsFree(false);
        if (!failed) setNotice("No complete question was heard. Press Start to try again.");
      }
    };
    try {
      r.start();
      setListening(true);
      timer.current = setTimeout(() => r.stop(), 30000);
    } catch {
      speech.current = null;
      setListening(false);
      handsRef.current = false;
      setHandsFree(false);
      setNotice("Dictation could not start. Try again or type your question.");
    }
  }
  resumeRef.current = () => {
    if (
      !handsRef.current ||
      busyRef.current ||
      waiting.current ||
      queue.current ||
      speech.current ||
      document.hidden
    )
      return;
    if (resume.current) clearTimeout(resume.current);
    resume.current = setTimeout(() => {
      if (
        handsRef.current &&
        !busyRef.current &&
        !queue.current &&
        !waiting.current &&
        !document.hidden
      )
        startRecognition(true);
    }, 350);
  };
  useEffect(() => {
    alive.current = true;
    setSupported(
      !!(
        (window as SpeechWindow).SpeechRecognition ??
        (window as SpeechWindow).webkitSpeechRecognition
      ),
    );
    const paused = () => {
      if (document.hidden) {
        stop();
        setNotice("Voice paused while this page was hidden. Start it again when ready.");
      }
    };
    const stopAll = () => stop();
    document.addEventListener("visibilitychange", paused);
    window.addEventListener("vela-stop-audio", stopAll);
    return () => {
      alive.current = false;
      microphoneGeneration.current++;
      document.removeEventListener("visibilitychange", paused);
      window.removeEventListener("vela-stop-audio", stopAll);
      handsRef.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (resume.current) clearTimeout(resume.current);
      if (speech.current) {
        speech.current.onend = null;
        speech.current.abort();
      }
      if (recorder.current?.state === "recording") {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      media.current?.getTracks().forEach((t) => t.stop());
      controller.current?.abort();
      generation.current++;
      window.speechSynthesis?.cancel();
    };
  }, []);
  useEffect(() => {
    const text = speechText(answer);
    if (!text.startsWith(lastText.current)) {
      cursor.current = 0;
      cancelSpeech();
    }
    lastText.current = text;
    if (!speak || !("speechSynthesis" in window) || listening) return;
    const tail = text.slice(cursor.current),
      segments = speechSegments(tail, !busy);
    cursor.current += segments.end;
    for (const sentence of segments.sentences) {
      const u = new SpeechSynthesisUtterance(sentence);
      u.lang = "en-ZA";
      u.rate = 0.95;
      u.voice =
        speechSynthesis.getVoices().find((v) => v.lang === "en-ZA") ??
        speechSynthesis.getVoices().find((v) => v.lang.startsWith("en")) ??
        null;
      const current = generation.current;
      queue.current++;
      u.onstart = () => {
        if (alive.current && current === generation.current) setSpeaking(true);
      };
      const complete = () => {
        if (!alive.current || current !== generation.current) return;
        queue.current = Math.max(0, queue.current - 1);
        if (!queue.current) {
          setSpeaking(false);
          resumeRef.current();
        }
      };
      u.onend = complete;
      u.onerror = () => {
        if (!alive.current || current !== generation.current) return;
        complete();
        handsRef.current = false;
        setHandsFree(false);
        setNotice("Speech playback stopped. You can read the response and restart voice.");
      };
      speechSynthesis.speak(u);
    }
    if (!busy) resumeRef.current();
  }, [answer, busy, speak, listening]);
  function beginConversation() {
    setSpeak(true);
    setHandsFree(true);
    handsRef.current = true;
    cursor.current = speechText(answer).length;
    lastText.current = speechText(answer);
    startRecognition(true);
  }
  function toggleRead(enabled: boolean) {
    setSpeak(enabled);
    if (!enabled) {
      cancelSpeech();
      handsRef.current = false;
      setHandsFree(false);
    } else cursor.current = 0;
  }
  async function record() {
    if (busyRef.current) return;
    cancelSpeech();
    const recordingGeneration = ++microphoneGeneration.current;
    setPending(true);
    setNotice("");
    try {
      if (!navigator.mediaDevices || typeof MediaRecorder === "undefined")
        throw Error("This browser cannot record audio. Use text instead.");
      const capturedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current || recordingGeneration !== microphoneGeneration.current) {
        capturedStream.getTracks().forEach((t) => t.stop());
        return;
      }
      media.current = capturedStream;
      const parts: Blob[] = [];
      let bytes = 0;
      const r = new MediaRecorder(media.current);
      recorder.current = r;
      r.ondataavailable = (e) => {
        if (e.data.size) {
          bytes += e.data.size;
          parts.push(e.data);
          if (bytes > 3900000 && r.state === "recording") r.stop();
        }
      };
      r.onstop = async () => {
        if (timer.current) clearTimeout(timer.current);
        capturedStream.getTracks().forEach((t) => t.stop());
        setListening(false);
        if (!alive.current || recordingGeneration !== microphoneGeneration.current) return;
        setPending(true);
        controller.current = new AbortController();
        try {
          if (bytes > 4000000) throw Error("The recording was too large. Try a shorter question.");
          const response = await fetch(
            `/api/tutor/voice?studyUnitId=${encodeURIComponent(studyUnitId)}`,
            {
              method: "POST",
              headers: { "Content-Type": r.mimeType },
              body: new Blob(parts, { type: r.mimeType }),
              signal: controller.current.signal,
            },
          );
          const d = await response.json();
          if (!response.ok) throw Error(d.error?.message || "Transcription is unavailable.");
          if (alive.current && recordingGeneration === microphoneGeneration.current)
            setDraft(d.transcript);
        } catch (e) {
          if (
            alive.current &&
            recordingGeneration === microphoneGeneration.current &&
            (e as Error).name !== "AbortError"
          )
            setNotice((e as Error).message);
        } finally {
          if (alive.current && recordingGeneration === microphoneGeneration.current)
            setPending(false);
        }
      };
      r.start(250);
      setPending(false);
      setListening(true);
      timer.current = setTimeout(() => {
        if (r.state === "recording") r.stop();
      }, 30000);
    } catch (e) {
      if (alive.current && recordingGeneration === microphoneGeneration.current) {
        media.current?.getTracks().forEach((t) => t.stop());
        setPending(false);
        setNotice((e as Error).message);
      }
    }
  }
  return {
    supported,
    listening,
    speaking,
    pending,
    draft,
    setDraft,
    notice,
    speak,
    handsFree,
    stop,
    startRecognition,
    beginConversation,
    toggleRead,
    record,
    send: () => void send(draft),
    stopCapture: () => {
      speech.current?.stop();
      if (recorder.current?.state === "recording") recorder.current.stop();
    },
  };
}
