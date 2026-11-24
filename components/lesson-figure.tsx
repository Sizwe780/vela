import { lessonFigure } from "../lib/content/lesson-figures";

export function LessonFigure({ src }: { src: string }) {
  const figure = lessonFigure(src);
  if (!figure) return null;
  return (
    <figure className="approved-lesson-figure">
      <a
        href={figure.src}
        target="_blank"
        rel="noreferrer"
        aria-label="Open full-size figure in a new tab"
      >
        {/* Authored SVG has verified dimensions and can be enlarged directly. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={figure.src}
          srcSet={figure.variants?.map(({ src, width }) => `${src} ${width}w`).join(", ")}
          sizes={figure.variants ? "(max-width: 600px) 92vw, 650px" : undefined}
          alt={figure.alt}
          width={figure.width}
          height={figure.height}
          loading="lazy"
        />
      </a>
      <figcaption>
        {figure.caption}
        <small>
          {figure.sourceUrl ? (
            <a href={figure.sourceUrl} target="_blank" rel="noreferrer">
              {figure.credit}
            </a>
          ) : (
            figure.credit
          )}
          {figure.license && (
            <>
              {" "}
              ·{" "}
              <a href={figure.license.url} target="_blank" rel="noreferrer">
                {figure.license.name}
              </a>
            </>
          )}
        </small>
        {figure.notice && <small>{figure.notice}</small>}
      </figcaption>
    </figure>
  );
}
