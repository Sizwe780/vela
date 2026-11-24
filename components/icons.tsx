import type { CSSProperties } from "react";

const paths = {
  book: "M12 5.5C9 3.5 5 3.5 2 5v15c3-1.5 7-1.5 10 .5m0-15c3-2 7-2 10-.5v15c-3-1.5-7-1.5-10 .5m0-15v15",
  sparkle: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  back: "M19 12H5m6-6-6 6 6 6",
  send: "m5 12 7-7 7 7M12 5v15",
  check: "m5 12 4 4L19 6",
  close: "m6 6 12 12M6 18 18 6",
  link: "M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-2 2m3 6a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l2-2",
  reset: "M3 11a9 9 0 1 1 2 7M3 4v7h7",
  chevron: "m8 5 7 7-7 7",
  stop: "M6 6h12v12H6Z",
};
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: keyof typeof paths;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
