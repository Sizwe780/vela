"use client";
import dynamic from "next/dynamic";
export const MathLabLoader = dynamic(() => import("./math-lab").then((m) => m.MathLab), {
  ssr: false,
  loading: () => <p role="status">Opening your scratchpad…</p>,
});
