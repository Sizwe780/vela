import type { SpecUnit } from "../../lib/specs";

type Exercise = readonly [title: string, question: string, answer: string];

function reveal([title, question, answer]: Exercise) {
  return `:::exercise ${title}\n${question}\n:::answer\n${answer}\n:::end`;
}

export const teachingPracticeUnits = [
  {
    code: "TPS2601-U1",
    title: "Guided observation",
    outcome: "Record a specific classroom event and choose a follow-up that can distinguish plausible explanations.",
    sessions: [{
      title: "Separate observation from inference",
      visual: null,
      concepts: ["guided observation"],
      markdown: [
        "## Learning goal\nRecord a specific classroom event and choose a follow-up that can distinguish plausible explanations.",
        "## Prerequisites\nRecognise the difference between a quotation, a description and a claim about understanding.",
        "## Intuition first\nThree groups changing their answers after hearing a classmate is something you can see. Whether they understood or simply followed the speaker is a separate question.",
        "## Why this works\nStart with a focus question narrow enough to observe, such as how learners justify a fraction comparison. Record the task, the action or words, and their sequence. Write the interpretation separately and use tentative language. Name an alternative that also fits the record. Then propose new evidence that would favour one interpretation.\n\n| Time in a fictional lesson | Observation | What remains open |\n| --- | --- | --- |\n| 08:12 | The teacher selects a volunteer after two seconds. | How many learners had prepared an answer? |\n| 08:13 | A respondent uses the number of pieces to justify a comparison. Three groups change their choices. | Did the groups adopt the reasoning or follow the publicly stated choice? |\n| 08:15 | Two pairs compare drawings made at different scales. | Would their explanations change if the wholes matched? |",
        "## Visual exploration\n![Synthetic observation record separating direct events from interpretation](/lesson-figures/tps-observation-record.svg)\n\nCompare the three rows. Point to what an observer could record directly, then underline any statement that would require further evidence.",
        "## Common mistakes\nReplace labels such as distracted or unmotivated with observable behaviour. One event may suggest a hypothesis about reasoning. It rarely supports a conclusion about the entire class.",
        "## Original worked example\n" + reveal(["Complete a practice note","Use the fictional 08:13 event to record a warranted interpretation, an alternative and a follow-up.","The comment suggests a denominator misconception. Unequal drawings might also have influenced the comparison. Align equal-size strips and collect individual explanations before a public answer is given."]),
        "## Assessment\n" + [
          "### Recognition\n" + reveal(["Identify the observation","Which is directly observed: two pairs used unequal drawings, or two pairs lacked confidence?","The unequal drawings are observable. Confidence is an inference requiring more evidence."]),
          "### Procedure\n" + reveal(["Write a focused record","At 08:20 two learners revise their drawings after the teacher aligns the strips. What should your note capture?","Record the time, the alignment demonstrated and the two revisions. Identify what changed in the drawings if visible."]),
          "### Error correction\n" + reveal(["Repair a claim","A note says the whole class mastered the topic because a volunteer answered correctly. Revise it.","Record that one volunteer answered correctly. Use an individual comparison with a reason before judging class understanding."]),
          "### Transfer\n" + reveal(["Transfer the method","In a science lesson, several groups copy the first group's graph. What follow-up tests whether they can interpret a slope?","Have each learner interpret a new graph independently and explain what both axes and the slope mean."]),
        ].join("\n\n"),
        "## Pause and Predict\n" + reveal(["Predict the evidence","Would a second whole-class vote settle whether learners understand the reasoning?","It adds another choice count. Individual explanations on a fresh example can distinguish reasoning from agreement."]),
      ].join("\n\n"),
    }],
  },
  {
    code: "TPS2601-U2",
    title: "Lesson planning rehearsal",
    outcome: "Plan a short lesson whose activity, evidence check and follow-up support the same intended learning.",
    sessions: [{
      title: "Plan a lesson around observable learning",
      visual: null,
      concepts: ["lesson planning rehearsal"],
      markdown: [
        "## Learning goal\nPlan a short lesson whose activity, evidence check and follow-up support the same intended learning.",
        "## Prerequisites\nWrite a specific learning intention and identify the thinking that would demonstrate it.",
        "## Intuition first\nA lively activity can produce the expected answer while leaving the reasoning hidden. Decide in advance what learners must show and how you’ll respond when their answers differ.",
        "## Why this works\nPlan backward from the evidence. For fraction comparison, ask learners to decide which single piece is larger when two equal wholes are divided differently. The activity should keep the wholes equal, and the check should require both a choice and a reason. Provide tactile or clearly marked strips and describe the comparisons aloud. Use the same reasoning criterion across response formats.\n\n| Plan decision | Rehearsal choice |\n| --- | --- |\n| Intended learning | Explain why one fourth is larger than one sixth when the wholes match |\n| Elicit initial thinking | Ask for an individual prediction and their reason |\n| Teach and practise | Align equal strips and compare one piece from each |\n| Check | Compare one third and one fifth using equal wholes and explain why |\n| Respond | Revisit equal wholes and piece size if the reason refers only to the count |",
        "## Visual exploration\n![Synthetic lesson rehearsal sequence linking intention to evidence](/lesson-figures/tps-lesson-rehearsal.svg)\n\nTrace the intention through the activity and the final check. Circle the part where each learner must show reasoning.",
        "## Common mistakes\nAn activity describes what learners do. An intention describes what they should learn. A check that asks only for a choice cannot distinguish a guess from sound reasoning.",
        "## Original worked example\n" + reveal(["Repair a weak plan","A rehearsal plan ends with the teacher asking whether everyone understands. Replace that check and give a response to one likely misconception.","Give equal strips for thirds and fifths, then ask each learner to choose the larger piece and explain. If a learner selects fifths because five is larger, align the strips and compare one piece directly before asking for a new explanation."]),
        "## Assessment\n" + [
          "### Recognition\n" + reveal(["Choose an intention","Which is a learning intention: cut out two strips, or explain how the size of a part changes as equal wholes are divided?","Explaining part size is the learning intention. Cutting strips is an activity supporting it."]),
          "### Procedure\n" + reveal(["Design a check","Suggest a task that checks whether learners transfer the reasoning to a new pair.","Ask them to compare one fifth and one eighth with equal wholes and explain how the number of equal parts affects piece size."]),
          "### Error correction\n" + reveal(["Repair a barrier","A plan relies on colours alone to distinguish the strips. How could you preserve the learning demand and improve access?","Add labelled or tactile boundaries and describe the strips aloud. Keep the comparison and reasoning requirement."]),
          "### Transfer\n" + reveal(["Plan a response","The learner picks the larger piece correctly and explains using the wrong whole. What do you do next?","Check how the wholes were chosen, supply aligned equal wholes and ask the learner to compare again with a reason."]),
        ].join("\n\n"),
        "## Pause and Predict\n" + reveal(["Predict the outcome","Would an exit ticket with the same numbers just demonstrated give strong evidence of transfer?","It may show immediate recall. Change the pair while preserving the underlying reasoning to check transfer."]),
      ].join("\n\n"),
    }],
  },
  {
    code: "TPS2601-U3",
    title: "Portfolio reflection rehearsal",
    outcome: "Choose evidence that supports a claim, state its limitation and plan a check for improvement.",
    sessions: [{
      title: "Build a reflection from evidence",
      visual: null,
      concepts: ["portfolio reflection rehearsal"],
      markdown: [
        "## Learning goal\nChoose evidence that supports a claim, state its limitation and plan a check for improvement.",
        "## Prerequisites\nDistinguish an observation record from a conclusion about learner reasoning.",
        "## Intuition first\nA correct choice and a blank explanation can sit on the same answer sheet. A strong reflection tells the reader what the evidence establishes and what another check could reveal.",
        "## Why this works\nStart with a claim narrow enough for the evidence. Cite the synthetic evidence label, describe what it shows, then name what remains uncertain. Propose a feasible change and specify what you would collect next. Keep practice reflections free of identifiable records and separate from formal placement or mentor verification.\n\n| Synthetic card | Evidence | Warranted reading |\n| --- | --- | --- |\n| A | Says sixths are larger because six exceeds four | Gives a denominator-based reason |\n| B | Compares piece sizes when the wholes match | Gives the target reasoning for this task |\n| C | Circles the larger correct piece without a reason | Shows a correct choice with reasoning still open |",
        "## Visual exploration\n![Synthetic portfolio evidence index linking evidence, claim, limitation and next check](/lesson-figures/tps-portfolio-evidence.svg)\n\nCompare Cards B and C. Try writing the strongest warranted sentence about each, then compare the strength of the claims.",
        "## Common mistakes\nA reflection needs a reason for the change and a check of its effect. Use fictional evidence in rehearsal, and keep actual attendance, mentor signatures and learner records in authorized institutional channels.",
        "## Original worked example\n" + reveal(["Draft a portfolio entry","Use cards A and C to write one short evidence-based reflection with a next action and a way to check it.","Card A shows one explicit denominator misconception. Card C shows a correct choice with no explanation, so the two cards do not establish class understanding. Next time, collect an individual explanation with aligned equal strips before and after pair discussion. Compare changes in reasoning, including whether learners relate part size to the whole."]),
        "## Assessment\n" + [
          "### Recognition\n" + reveal(["Choose evidence","Which card directly shows the intended reasoning?","Card B gives the correct comparison and explicitly holds the whole fixed."]),
          "### Procedure\n" + reveal(["Write a checkable action","Replace 'improve my questioning' with an action you can evaluate.","Ask every learner to compare a fresh pair with an individual written or spoken reason, then compare the reasons before and after the demonstration."]),
          "### Error correction\n" + reveal(["Correct an inference","A reflection says Card C proves understanding. What is a stronger phrasing?","Card C shows a correct selection. The reason remains unknown, so collect an explanation before drawing a stronger conclusion."]),
          "### Transfer\n" + reveal(["Transfer to a mentor conversation","What would you take to a rehearsal discussion, and what would you ask?","Bring the fictional plan and evidence cards. Ask which prompt could distinguish a guess from a sound comparison, and what evidence would be feasible to collect."]),
        ].join("\n\n"),
        "## Pause and Predict\n" + reveal(["Predict the evidence","If more learners circle the correct answer after discussion, can you claim the misconception disappeared?","Report the change in choices. Compare individual explanations before making a claim about the misconception."]),
      ].join("\n\n"),
    }],
  },
  {
    code: "TPS2601-U4",
    title: "Assessment evidence and feedback",
    outcome: "Judge fictional learner responses against a learning criterion and plan feedback with a fresh check.",
    sessions: [{
      title: "Assess learner reasoning and plan feedback",
      visual: null,
      concepts: ["formative assessment", "evidence", "feedback", "reassessment"],
      markdown: [
        "## Learning goal\nUse a shared criterion to interpret learner responses, give targeted feedback and choose a fresh task to check progress.",
        "## Prerequisites\nDistinguish a correct choice from evidence of reasoning in the portfolio reflection lesson.",
        "## Intuition first\nTwo learners can circle the same answer for different reasons. Read the explanation before deciding who needs a hint and who is ready for a new challenge.",
        "## Why this works\nUse a criterion that describes the reasoning you need to see. For comparing one fourth and one sixth, look for an explanation that holds the whole constant and relates more equal parts to smaller individual pieces. Accept a spoken explanation, a labelled drawing or a written response when it shows the same reasoning. Record missing evidence as unresolved. Give feedback that points to a specific next action, then check it on a fresh task.",
        "## Visual exploration\n| Fictional response | Judgment against the criterion | Next prompt |\n| --- | --- | --- |\n| A chooses one sixth because six is greater than four | The explanation reveals a denominator misconception | Align the equal strips and compare one piece from each |\n| B chooses one fourth and explains that dividing the same whole into fewer pieces makes each piece larger | The target reasoning is visible for this item | Compare one fifth and one eighth and justify the result |\n| C chooses one fourth and leaves the explanation blank | The choice is correct. The reasoning is unresolved | Show both fractions on equal strips and explain your comparison |",
        "## Common mistakes\nA correct choice alone cannot establish reasoning. Use feedback that makes the next action clear. Keep this rehearsal fictional and separate from formal placement records and grading.",
        "## Original worked example\n" + reveal(["Assess a new response", "A fictional learner selects one third over one fifth and explains that three is less than five. Write feedback and a new check.", "The learner selected correctly, but the explanation gives a number rule without showing why it works. Ask them to mark thirds and fifths on equal strips and compare one part. Then ask them to compare one fourth and one seventh using a drawing or spoken explanation. Look for equal wholes and the relationship between number of parts and piece size."]),
        "## Assessment\n" + [
          "### Recognition\n" + reveal(["Identify the evidence", "Which fictional response demonstrates the target reasoning?", "B explicitly uses equal wholes and links the number of parts to their size."]),
          "### Procedure\n" + reveal(["Give actionable feedback", "Write feedback for A that gives a useful next move.", "Ask the learner to align two equal strips, shade one piece on each and describe which shaded piece is longer."]),
          "### Error correction\n" + reveal(["Repair a judgment", "A draft record labels C proficient. What should it say?", "The selection is correct. The explanation is missing, so the reasoning remains unresolved. Ask for an explanation before recording a stronger judgment."]),
          "### Transfer\n" + reveal(["Reuse the approach in science", "A learner chooses the correct graph but gives no reason. Design a fresh check.", "Give a new graph with different values and ask them to label the axes and explain what the slope represents. Apply the same reasoning criterion to writing, speech or an annotated graph."]),
        ].join("\n\n"),
        "## Pause and Predict\n" + reveal(["Check the follow-up", "If a learner repeats the teacher's words on the original example, what evidence would strengthen a claim of transfer?", "Collect an independent explanation on a new example. Look for the same underlying reasoning in the new setting."]),
      ].join("\n\n"),
    }],
  },
] satisfies (SpecUnit & { title: string; outcome: string })[];
