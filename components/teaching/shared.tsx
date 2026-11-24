"use client";
import type { FormEvent, ReactNode } from "react";
import type { TeachingCommand } from "../../lib/teaching/input";
import type { teachingWorkspace } from "../../lib/teaching/read";
import styles from "./workspace.module.css";

export type Json<T> = T extends Date
  ? string
  : T extends object
    ? { [K in keyof T]: Json<T[K]> }
    : T;
export type Workspace = NonNullable<
  Json<Awaited<ReturnType<typeof teachingWorkspace>>>["workspace"]
>;
export type WorkspaceProps = {
  data: Workspace;
  qualificationId: string;
  busy: boolean;
  send: (
    input: Omit<TeachingCommand, "qualificationId"> | Record<string, unknown>,
  ) => Promise<boolean>;
};

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.panel}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function ActionForm({
  children,
  onAction,
  label,
  busy,
  reset = false,
}: {
  children: ReactNode;
  onAction: (fields: FormData) => Promise<boolean>;
  label: string;
  busy: boolean;
  reset?: boolean;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if ((await onAction(new FormData(form))) && reset) form.reset();
  }
  return (
    <form className={styles.form} onSubmit={submit}>
      {children}
      <button disabled={busy} type="submit">
        {label}
      </button>
    </form>
  );
}

export const field = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export function ModuleOptions({ data }: { data: Workspace }) {
  return data.qualification.modules.map(({ module }) => (
    <option key={module.id} value={module.id}>
      {module.code} · {module.title}
    </option>
  ));
}

export function CohortOptions({ data }: { data: Workspace }) {
  return (
    <>
      <option value="">All enrolled learners</option>
      {data.cohorts.map((cohort) => (
        <option key={cohort.id} value={cohort.id}>
          {cohort.name}
        </option>
      ))}
    </>
  );
}

export function person(data: Workspace, id: string) {
  return data.people.find((row) => row.studentId === id)?.displayName ?? id;
}
