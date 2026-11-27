"use client";
import { useStudentResource } from "../../lib/student/client";
import type { LearningView } from "../../lib/learning/types";
import { LearningPreferences } from "./learning-preferences";
export function ProfileLearningPreferences() {
  const resource = useStudentResource<LearningView>("/api/learning");
  return (
    <section id="learning-preferences" className="profile-learning-settings">
      <h2>Study schedule & tutor privacy</h2>
      <p>
        Review dates and weekly goals use South African time (Africa/Johannesburg, UTC+02:00).
        Availability periods are saved as exact dates and shown in your device’s local time.
      </p>
      {resource.data?.ownerId === resource.userId && resource.data ? (
        <LearningPreferences key={resource.userId} view={resource.data} onSaved={resource.reload} />
      ) : (
        <p role="status">{resource.error || "Loading learning preferences…"}</p>
      )}
      {resource.error && (
        <button type="button" onClick={resource.reload}>
          Retry learning preferences
        </button>
      )}
    </section>
  );
}
