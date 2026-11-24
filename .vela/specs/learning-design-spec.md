# Universal learning design specification
Version: 1.2.0

This core applies to every institution, qualification and domain. Extensions add depth; they cannot weaken core rules.

## Clean-room authorship
Pass 1 extracts factual concepts, theorem hypotheses, definitions, formulas, source identifiers and provenance into a concept inventory. Source narrative is not the draft template. Pass 2 synthesizes independently from that inventory with the source prose closed: choose a different conceptual sequence, original numerical parameters and original teaching contexts. Never reproduce verbatim source prose or follow its paragraph structure. Standard facts and formulas retain their mathematical meaning. Do not claim universal uniqueness of numerical values.

Write intuition first, scaffold from informal reasoning to notation, and include a Pause and Predict checkpoint with feedback. Keep each session a coherent conceptual milestone rather than a PDF page interval. Make prerequisite assumptions, restrictions and uncertainty visible. A learner must be able to distinguish an original example, a source fact and a teaching analogy.

## Privacy and regulatory provenance
POPIA is a legal obligation requiring institution-specific review, not a badge granted by this file. Minimize learner data, isolate personal notes and progress by authenticated identity, keep secrets server-side, and maintain retention/deletion and lawful-processing policies. Do not include personal learner records in generated lessons or model prompts. Suspected identifiers must be reviewed before publication.

Separate qualification SAQA metadata from independently verified criterion mappings. A SAQA qualification ID does not verify local criterion wording, CAPS policy or assessment rules. Use CURRICULUM for local mappings; use SAQA_VERIFIED only with authoritative provenance and review. Never invent official policy, marks, accreditation or guaranteed compliance.

Authoritative verification entry points: https://www.gov.za/documents/protection-personal-information-act , https://regqs.saqa.org.za/ , https://www.saqa.org.za/frequently-asked-questions/ . These support institution-specific review and do not certify generated content.

## Visible teaching and independent attempts

Write every teaching section, example, answer, visual caption and tutor explanation so learners can use it without knowing the institution, module code, source guide or academic year. Introduce the concept by name and explain its purpose. Use concepts as prerequisites. Record guide editions, page mappings, official assessment arrangements and editorial uncertainty in source metadata or the staff review record. Attribute named frameworks and factual evidence where relevant. Explain actual professional standards when they are the subject of the lesson.

Place a visual beside the idea it explains. Choose a real image for observation, a schematic for structure, or a bounded interaction for change and comparison. Give readers something to notice, predict or explain. Verify labels, scales, values and limitations against the lesson. Provide a keyboard route and text equivalent.
Each session begins with a substantive Learning goal and Prerequisites, then explains Why this works / conditions. Teach the concept, rule justification and conditions visibly before asking learners to attempt a problem. Labels or repeated promises to explain later do not constitute instruction. Keep conceptual exposition visible; do not hide the entire lesson in answer drawers.

All original worked examples, assessment questions and Pause and Predict feedback use the exercise protocol in assessment-spec.md. The learner sees the question before any solution and independently attempts it before choosing Show answer. Revealing feedback is a reading action, never evidence of mastery. Common-mistake discussion may explain a conceptual misconception visibly, but a specific exercise's answer and numerical result belong inside its answer block.

## Active-session tutoring and qualification navigation
A tutor request identifies the active persisted authored session, validated against the supplied unit and authorized learner context on the server. Ground the explanation in that session and relevant source RAG, with source provenance kept distinct from authored teaching. Never trust client-supplied session text, titles or identifiers as proof of membership. A session switch clears prior session chat/context; do not silently continue answering from a different lesson. Ask a focused clarifying question if the active task or intended method is ambiguous. Grounding reduces risk but cannot guarantee model accuracy.

The learner library preserves Qualification → Module → Study unit → Session hierarchy, including qualification/module membership. Reused modules may appear under their registered qualifications; do not flatten unrelated units or expose a mixed unit list as though it were a course path.
