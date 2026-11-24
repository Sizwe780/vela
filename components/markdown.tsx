"use client";

import { LessonFigure } from "./lesson-figure";
import { lessonFigure } from "../lib/content/lesson-figures";
import React, { useMemo } from "react";
import { savedHighlightPlugin } from "../lib/content/highlights";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import { katexOptions } from "../lib/content/katex";
import { normalizeMath } from "../lib/content/normalize-math";
import type { Citation } from "../lib/tutor/types";
import { DiscussionParagraph } from "./social/discussion-context";

export function Markdown({
  text,
  highlights,
  citations,
  onCitation,
  approvedLessonFigures = false,
}: {
  text: string;
  highlights?: string[];
  citations?: Citation[];
  onCitation?: (id: string) => void;
  approvedLessonFigures?: boolean;
}) {
  const highlight = useMemo(() => savedHighlightPlugin(highlights ?? []), [highlights]);
  const markdown = useMemo(() => normalizeMath(text), [text]);
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, highlight]}
        rehypePlugins={[[rehypeKatex, katexOptions]]}
        skipHtml
        urlTransform={(url) => {
          if (citations) return citations.some((source) => source.url === url) ? url : "";
          return defaultUrlTransform(url);
        }}
        components={{
          p: ({ node, children }) => {
            const first = node?.children[0];
            if (
              approvedLessonFigures &&
              !citations &&
              node?.children.length === 1 &&
              first?.type === "element" &&
              first.tagName === "img" &&
              typeof first.properties.src === "string" &&
              lessonFigure(first.properties.src)
            )
              return <LessonFigure src={first.properties.src} />;
            return (
              <DiscussionParagraph
                raw={
                  node?.position
                    ? markdown.slice(node.position.start.offset, node.position.end.offset)
                    : ""
                }
              >
                {children}
              </DiscussionParagraph>
            );
          },
          a: ({ href, children }) => {
            const source = citations?.find((citation) => citation.url === href);
            if (source)
              return (
                <a
                  className="inline-citation"
                  href={source.url}
                  title={`${source.title} · ${source.criterion.code}`}
                  onClick={(event) => {
                    if (onCitation) {
                      event.preventDefault();
                      onCitation(source.chunkId);
                    }
                  }}
                >
                  {children}
                </a>
              );
            if (!href) return <span>{children}</span>;
            return (
              <a
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
          img: ({ alt, src }) => {
            const figure =
              approvedLessonFigures && !citations && typeof src === "string"
                ? lessonFigure(src)
                : undefined;
            if (!figure)
              return (
                <span className="image-placeholder">{alt ? `[Image: ${alt}]` : "[Image]"}</span>
              );
            // Inline images can sit inside a link or paragraph, where a block figure would be invalid.
            return (
              <>
                <img
                  src={figure.src}
                  alt={figure.alt}
                  title={`${figure.caption} ${figure.credit}`}
                  width={figure.width}
                  height={figure.height}
                  loading="lazy"
                  style={{ maxWidth: "100%", height: "auto" }}
                />
                {figure.notice && <small>{figure.notice}</small>}
              </>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
