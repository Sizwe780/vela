"use client";
import { useEffect, useRef, useState } from "react";
export type Plot = {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  x: (n: number) => number;
  y: (n: number) => number;
  colors: {
    grid: string;
    axis: string;
    curve: string;
    secondary: string;
    text: string;
    surface: string;
  };
};
export function useCanvasPlot(
  draw: (plot: Plot) => void,
  xRange: [number, number],
  yRange: [number, number],
  equalScale = false,
) {
  const canvas = useRef<HTMLCanvasElement>(null),
    paint = useRef(draw);
  paint.current = draw;
  const [size, setSize] = useState({ width: 480, height: 360 }),
    [theme, setTheme] = useState(0);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const resize = new ResizeObserver((entries) => {
      const width = Math.max(220, entries[0].contentRect.width);
      setSize((old) => (Math.abs(old.width - width) < 0.5 ? old : { width, height: width * 0.75 }));
    });
    resize.observe(element);
    const observer = new MutationObserver(() => setTheme((v) => v + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => {
      resize.disconnect();
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    const element = canvas.current,
      context = element?.getContext("2d");
    if (!element || !context) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    element.width = Math.round(size.width * ratio);
    element.height = Math.round(size.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size.width, size.height);
    const css = getComputedStyle(document.documentElement);
    const color = (key: string) => css.getPropertyValue(key).trim();
    const xScale = (size.width - 84) / (xRange[1] - xRange[0]),
      yScale = (size.height - 54) / (yRange[1] - yRange[0]),
      scale = Math.min(xScale, yScale),
      x = (v: number) =>
        64 +
        (size.width - 84) / 2 +
        (v - (xRange[0] + xRange[1]) / 2) * (equalScale ? scale : xScale),
      y = (v: number) =>
        20 +
        (size.height - 54) / 2 -
        (v - (yRange[0] + yRange[1]) / 2) * (equalScale ? scale : yScale);
    paint.current({
      context,
      ...size,
      x,
      y,
      colors: {
        grid: color("--graph-grid"),
        axis: color("--graph-axis"),
        curve: color("--graph-primary"),
        secondary: color("--graph-secondary"),
        text: color("--text-primary"),
        surface: color("--surface-card"),
      },
    });
  }, [draw, size, theme, equalScale, xRange[0], xRange[1], yRange[0], yRange[1]]);
  return canvas;
}
export function line(
  plot: Plot,
  from: [number, number],
  to: [number, number],
  color: string,
  width = 1,
) {
  const { context: c, x, y } = plot;
  c.beginPath();
  c.moveTo(x(from[0]), y(from[1]));
  c.lineTo(x(to[0]), y(to[1]));
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}
export function arrow(plot: Plot, to: [number, number], color: string) {
  if (to[0] === 0 && to[1] === 0) {
    const { context: c, x, y } = plot;
    c.beginPath();
    c.arc(x(0), y(0), 3, 0, 2 * Math.PI);
    c.fillStyle = color;
    c.fill();
    return;
  }
  line(plot, [0, 0], to, color, 2.5);
  const { context: c, x, y } = plot,
    angle = Math.atan2(y(to[1]) - y(0), x(to[0]) - x(0));
  c.beginPath();
  c.moveTo(x(to[0]), y(to[1]));
  c.lineTo(x(to[0]) - 9 * Math.cos(angle - 0.4), y(to[1]) - 9 * Math.sin(angle - 0.4));
  c.lineTo(x(to[0]) - 9 * Math.cos(angle + 0.4), y(to[1]) - 9 * Math.sin(angle + 0.4));
  c.closePath();
  c.fillStyle = color;
  c.fill();
}
export function axes(plot: Plot, xRange: [number, number], yRange: [number, number]) {
  const { context: c, x, y, colors } = plot;
  c.font = "11px system-ui";
  c.fillStyle = colors.text;
  const count = plot.width < 360 ? 2 : 4;
  for (let i = 0; i <= count; i++) {
    const xv = xRange[0] + (i * (xRange[1] - xRange[0])) / count,
      yv = yRange[0] + (i * (yRange[1] - yRange[0])) / count;
    line(plot, [xv, yRange[0]], [xv, yRange[1]], colors.grid);
    line(plot, [xRange[0], yv], [xRange[1], yv], colors.grid);
    c.textAlign = "center";
    c.fillText(Number(xv.toPrecision(9)).toString(), x(xv), plot.height - 10);
    c.textAlign = "right";
    c.fillText(Number(yv.toPrecision(9)).toString(), 60, y(yv) + 4);
  }
  if (xRange[0] <= 0 && xRange[1] >= 0)
    line(plot, [0, yRange[0]], [0, yRange[1]], colors.axis, 1.5);
  if (yRange[0] <= 0 && yRange[1] >= 0)
    line(plot, [xRange[0], 0], [xRange[1], 0], colors.axis, 1.5);
}
export function clipPlot(plot: Plot, draw: () => void) {
  const c = plot.context;
  c.save();
  c.beginPath();
  c.rect(64, 20, plot.width - 84, plot.height - 54);
  c.clip();
  draw();
  c.restore();
}
