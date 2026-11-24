# Teaching and administration

Open **Teaching workspace** from the learning sidebar or visit `/staff`. Access comes from a staff membership assigned to a qualification. An administrator can manage access only within that qualification. Learners use **Classroom** at `/classroom` for assignments, feedback and announcements.

| Workflow | Instructor | Qualification administrator |
| --- | --- | --- |
| Author or revise a lesson, submit a draft, inspect source conversions | Yes | Yes |
| Return a draft for changes or publish another author’s draft | | Yes |
| Manage cohorts, post announcements, create assignments and grade submissions | Yes | Yes |
| Download aggregate module counts | Yes | Yes |
| Manage invitations, staff roles, enrolment and qualification settings | | Yes |
| Review audit history | | Yes |

## Editorial handoff

1. In **Lessons and sources**, select the unit. Compare the converted text with the original PDF and record what needs correction or what has been compared. A source review records the editorial decision. The ingestion team still owns any correction or reimport.
2. Select **Append a new session** or load an existing session to start a revision. Follow the module’s registered [Vela specifications](.vela/specs/README.md). Keep worked solutions and assessment answers in the supported reveal blocks. Save the draft and submit it.
3. A different qualification administrator reviews the pedagogy, worked answers, originality and source accuracy. Record that evidence and return for changes or publish. The publish action runs the automated spec checks and indexes the new reading in pgvector before it goes live. Modules need a registered spec and an assessment criterion mapped to the unit’s learning outcome. Releases of shared modules require administrator access to every linked qualification.
4. Open the released session and verify the reader, math, exercises and companion citations. Revisions retain a previous version snapshot and the existing session identifier. To restore an earlier lesson, submit its Markdown as a new revision for review.

## Classroom handoff

Create a cohort and add enrolled learners. Create an assignment for the whole module or select the cohort. Add a due date and scored rubric criteria. Learners can edit their work until the deadline or grading, whichever comes first. Instructors can select a submission, score each criterion and leave feedback that the learner sees in Classroom. Assignment scores are stored separately from active-recall mastery. Announcements can be published to the qualification or a single cohort.

## Access and reporting

- Disable self-enrolment for the qualification or for one module to move new enrolments to invitations. Existing active or completed enrolments retain learning access. Administrators can update the status of individual enrolments.
- Create an invitation for a learner and module, or for an instructor and qualification. Share the link privately. It is single-use, expires after seven days and requires the invited account’s verified email. Pending invitations can be revoked. The workspace shows the link once and sends no email.
- Administrator access can be assigned to an existing qualification staff member. The workspace protects the last administrator from removal or demotion.
- Audit history shows recent actions in the qualification. Module CSV counts are scoped to that qualification and include no student names or answers.

Qualification creation and archiving, organisation-wide tenancy, identity-provider administration, integration credentials and institution-wide reports are separate development work.
