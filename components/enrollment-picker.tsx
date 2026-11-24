"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { notifyProgress } from "../lib/progress-events";
import { safeReturnPath } from "../lib/enrollment/return-path";
import { psmFirstLevel, psmQualification } from "../lib/curriculum/psm-first-level";
import {
  checkPsmSelection,
  isPsmLanguage,
  psmCreditLoad,
  psmLimits,
  psmStudyPeriod,
  type PlannedEnrollment,
} from "../lib/curriculum/psm-enrollment";
import styles from "./enrollment.module.css";

type ModuleOption = {
  studyYear: number;
  module: { id: string; code: string; title: string; _count: { studyUnits: number } };
};

type Qualification = {
  id: string;
  institution: string;
  code: string;
  title: string;
  streamTitle: string;
  isPsm: boolean;
  modules: ModuleOption[];
};

type ExistingEnrollment = PlannedEnrollment & { qualificationId: string; moduleId: string };
const psmCodes = new Set(psmFirstLevel.map(({ code }) => code));

export function EnrollmentPicker({
  qualifications,
  existing,
  requestedModule,
  initialPeriod,
  next,
}: {
  qualifications: Qualification[];
  existing: ExistingEnrollment[];
  requestedModule?: string;
  initialPeriod: { year: number; semester: number };
  next: string;
}) {
  const requested = qualifications.find((q) =>
    q.modules.some((m) => m.module.id === requestedModule),
  );
  const [qualificationId, setQualification] = useState(
    requested?.id ?? qualifications[0]?.id ?? "",
  );
  const [selected, setSelected] = useState<string[]>(
    requested &&
      requestedModule &&
      !existing.some(
        (row) => row.qualificationId === requested.id && row.moduleId === requestedModule,
      )
      ? [requestedModule]
      : [],
  );
  const [year, setYear] = useState(initialPeriod.year);
  const [semester, setSemester] = useState(initialPeriod.semester);
  const [languageConfirmed, setLanguageConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const qualification = qualifications.find((q) => q.id === qualificationId);
  const modules = qualification?.modules ?? [];
  const plan = existing.filter((row) => row.qualificationId === qualificationId);
  const enrolled = new Set(plan.map(({ moduleId }) => moduleId));
  const languageEnrolled = plan.find(({ code }) => isPsmLanguage(code));
  const languageModules = modules.filter(({ module }) => isPsmLanguage(module.code));
  const languageIds = new Set(languageModules.map(({ module }) => module.id));
  const languageChoice = selected.find((id) => languageIds.has(id));
  const codes = modules
    .filter(({ module }) => selected.includes(module.id))
    .map(({ module }) => module.code);
  const load = psmCreditLoad(
    [...plan, ...codes.map((code) => ({ code, year, semester, status: "active" as const }))],
    year,
  );
  const issue = qualification?.isPsm
    ? checkPsmSelection({ codes, existing: plan, year, semester, languageConfirmed })
    : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected.length || issue) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enroll",
          qualificationId,
          moduleIds: selected,
          ...(qualification?.isPsm ? { year, semester, languageConfirmed } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error?.message ?? "Enrollment failed. Try again.");
      notifyProgress();
      window.location.assign(safeReturnPath(next));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Enrollment failed.");
      setPending(false);
    }
  }

  function option({ studyYear, module }: ModuleOption, language = false) {
    const entry = psmFirstLevel.find(({ code }) => code === module.code);
    return (
      <label key={module.id} className={styles.option}>
        <input
          type={language ? "radio" : "checkbox"}
          name={language ? "psm-language" : undefined}
          checked={
            language
              ? languageEnrolled?.moduleId === module.id || languageChoice === module.id
              : enrolled.has(module.id) || selected.includes(module.id)
          }
          disabled={enrolled.has(module.id) || (language && !!languageEnrolled)}
          onChange={(event) => {
            if (language) setLanguageConfirmed(false);
            setSelected((ids) => {
              if (language) return [...ids.filter((id) => !languageIds.has(id)), module.id];
              return event.target.checked
                ? [...ids, module.id]
                : ids.filter((id) => id !== module.id);
            });
          }}
        />
        <span>
          <strong>
            {module.code} · {module.title}
          </strong>
          <small>
            {qualification?.isPsm && entry
              ? `12 credits · ${psmStudyPeriod(module.code) === "year" ? "Year module" : "Semester module"}`
              : `Year ${studyYear}`}
            {enrolled.has(module.id) ? " · On your plan" : ""}
            {module._count.studyUnits
              ? ` · ${module._count.studyUnits} study units`
              : " · Content in preparation"}
          </small>
          {qualification?.isPsm && !!entry?.coRequisites?.length && (
            <small>Co-requisites {entry.coRequisites.join(", ")}</small>
          )}
        </span>
      </label>
    );
  }

  return (
    <section className={styles.picker}>
      <span className="eyebrow">YOUR LEARNING PATH</span>
      <h1>What are you studying?</h1>
      <p>
        Choose your qualification and add modules to your study plan. Your notes and progress stay
        saved if you withdraw.
      </p>
      <form onSubmit={submit}>
        <label className={styles.qualification}>
          Qualification
          <select
            value={qualificationId}
            disabled={pending}
            onChange={(event) => {
              setQualification(event.target.value);
              setSelected([]);
              setLanguageConfirmed(false);
              setError("");
            }}
          >
            {qualifications.map((item) => (
              <option key={item.id} value={item.id}>
                {item.institution} · {item.code} · {item.title} · {item.streamTitle}
              </option>
            ))}
          </select>
        </label>
        {qualification?.isPsm && (
          <section className={styles.curriculumRoadmap} aria-labelledby="psm-plan-heading">
            <h2 id="psm-plan-heading">90104–PSM first-level curriculum</h2>
            <p>
              Complete all ten Group A modules and one Group B language for 132 credits. Plan across
              academic years to stay within the {psmLimits.annual}-credit annual limit.
            </p>
            <fieldset disabled={pending} className={styles.studyPeriod}>
              <legend>Study period for new modules</legend>
              <label>
                Academic year
                <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
                  {[initialPeriod.year, initialPeriod.year + 1].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Semester for semester modules
                <select
                  value={semester}
                  onChange={(event) => setSemester(Number(event.target.value))}
                >
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
                </select>
              </label>
            </fieldset>
            <p aria-live="polite">
              {year}: {load.annual}/{psmLimits.annual} credits · Semester 1: {load.first}/
              {psmLimits.semester} · Semester 2: {load.second}/{psmLimits.semester}
            </p>
            <p className={styles.note}>
              Year modules count toward the annual limit. Credits reflect modules planned on Vela.
            </p>
            <Link href={psmQualification.sourceUrl} target="_blank" rel="noreferrer">
              View UNISA’s qualification rules ↗
            </Link>
          </section>
        )}
        {qualification?.isPsm ? (
          <>
            <fieldset disabled={pending} className={styles.modules}>
              <legend>Group A · Compulsory modules</legend>
              {modules
                .filter(({ module }) => psmCodes.has(module.code) && !isPsmLanguage(module.code))
                .map((item) => option(item))}
            </fieldset>
            <fieldset disabled={pending} className={styles.modules}>
              <legend>Group B · Choose one language</legend>
              <p>
                You can add your language later. It must differ from your Home and First Additional
                Languages.
              </p>
              {!languageEnrolled && (
                <label className={styles.option}>
                  <input
                    type="radio"
                    name="psm-language"
                    checked={!languageChoice}
                    onChange={() => {
                      setSelected((ids) => ids.filter((id) => !languageIds.has(id)));
                      setLanguageConfirmed(false);
                    }}
                  />
                  <span>Choose later</span>
                </label>
              )}
              {languageModules.map((item) => option(item, true))}
              {languageChoice && !languageEnrolled && (
                <label className={styles.option}>
                  <input
                    type="checkbox"
                    checked={languageConfirmed}
                    onChange={(event) => setLanguageConfirmed(event.target.checked)}
                  />
                  <span>My choice differs from my Home and First Additional Languages.</span>
                </label>
              )}
            </fieldset>
            {modules.some(({ module }) => !psmCodes.has(module.code)) && (
              <fieldset disabled={pending} className={styles.modules}>
                <legend>Other available modules</legend>
                {modules
                  .filter(({ module }) => !psmCodes.has(module.code))
                  .map((item) => option(item))}
              </fieldset>
            )}
          </>
        ) : modules.length ? (
          <fieldset disabled={pending} className={styles.modules}>
            <legend>Select modules</legend>
            {modules.map((item) => option(item))}
          </fieldset>
        ) : (
          <p>No modules are available for this qualification yet.</p>
        )}
        {(error || issue) && <p role="alert">{error || issue}</p>}
        <button
          className="primary-button"
          type="submit"
          disabled={pending || !selected.length || !!issue}
        >
          {pending ? "Enrolling…" : "Save modules and continue"}
        </button>
        <p>
          <Link href="/">Back to my learning</Link>
        </p>
        <p className={styles.note}>
          Vela enrolment gives you access to learning tools. Complete your official registration
          separately with UNISA or your institution.
        </p>
      </form>
    </section>
  );
}
