"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStudentResource } from "../lib/student/client";
import { Icon } from "./icons";
import styles from "./student-pages.module.css";
type Result = {
  id: string;
  title: string;
  unitId: string;
  unitTitle: string;
  moduleCode: string;
  excerpt: string;
};
export function SessionSearch() {
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setTerm(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);
  const { data, error, loading } = useStudentResource<{ results: Result[]; scope: string }>(
    term.length >= 2 ? `/api/search?q=${encodeURIComponent(term)}` : null,
  );
  return (
    <>
      <form
        className={`${styles.form} lesson-search-box`}
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setTerm(query.trim());
        }}
      >
        <label>
          Search your enrolled lessons
          <span>
            <Icon name="book" size={18} />
            <input
              type="search"
              maxLength={100}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="A concept, formula or session title"
            />
          </span>
        </label>
      </form>
      <p className={styles.note}>
        Search covers published teaching and questions in your enrolled modules. Worked answers stay
        behind their reveal controls.
      </p>
      {term.length < 2 ? (
        <p>Enter at least two characters.</p>
      ) : (
        <>
          {loading && <p role="status">Searching…</p>}
          {error && <p role="alert">{error}</p>}
          {data && <p role="status">{data.results.length} matching sessions</p>}
          {data?.results.map((result) => (
            <article className={styles.card} key={result.id}>
              <small>
                {result.moduleCode} · {result.unitTitle}
              </small>
              <h2>
                <Link
                  className={styles.link}
                  href={`/study/${result.unitId}/sessions/${result.id}`}
                >
                  {result.title}
                </Link>
              </h2>
              <p>{result.excerpt}</p>
            </article>
          ))}
        </>
      )}
    </>
  );
}
