import type { SpecUnit } from "../../lib/specs";

export const teachingStrategies: SpecUnit = {
  code: "BPT1501-U4",
  title: "Multiple teaching and learning strategies",
  sessions: [
    {
      title: "Select a strategy by learner evidence",
      concepts: ["strategy", "learning intention", "differentiation", "formative evidence"],
      markdown: String.raw`## Learning goal
Choose a teaching strategy by starting with the intended learning, likely barriers and evidence that would show progress.

## Prerequisites
Distinguish a strategy from an activity. A strategy has a purpose, sequence and mechanism for checking whether learning occurred.

## Intuition first
If learners need to explain a pattern, asking one fluent learner to read an answer will reveal less than structured comparison, prediction and revision.

## Why this works
A strategy connects a learning goal to how learners encounter, process and demonstrate an idea. Direct explanation can be efficient for introducing a precise term or procedure. Inquiry, peer explanation and worked examples can support other goals, but they require accurate facilitation and accessible scaffolds.

The SACE Professional Teaching Standards emphasize choosing coherent learning experiences, anticipating difficulty, designing tasks that reveal understanding and using assessment evidence to plan next steps. Effective differentiation changes representation or support while keeping the learning intention explicit.

Consider direct instruction, cooperative learning, guided inquiry, problem-based learning and scaffolding. These strategies overlap. A teacher's choice should account for learning outcomes, subject demands, grade level and the learners' immediate needs.

## Choose an instructional response
Begin with the evidence you need from every learner. A group report can reveal collective reasoning while concealing which individuals can apply it independently. Plan an individual response before or after discussion so you can distinguish the two.

:::widget{type="teaching_framework" framework="instruction_choices"}
:::

Offer a labelled diagram, a brief oral explanation, and readable written instructions where these carry the same reasoning demand. Give all learners the same target and gather comparable evidence. If written work reveals a prerequisite gap, model that exact reasoning step and check it on a new example before returning to inquiry.

When choosing the room setup, check which learners can see, hear and move. Invite learners to suggest practical changes rather than assuming one layout works for everyone.

### Observe the room before planning
In the photograph, trace a route from the door to the display area. Imagine where you would put desks for a short demonstration, then for a discussion. The windows show where daylight enters. Check sightlines and glare from different seats before committing to a layout.

![A classroom at Zwelemfundo Public School in East London, South Africa](/lesson-figures/zwelemfundo-classroom.webp)

![Classroom layouts with a central aisle](/lesson-figures/classroom-discussion.svg)

## PCK teaching note
A strategy is defensible only when learner evidence is tied to the subject concept and to a likely alternative conception.

## Likely misconception
Inquiry is always more effective than direct explanation. Strategy choice depends on the goal, prior knowledge, complexity and available support.

## Formative check
Ask for one anticipated learner response and a specific next step. “Understand better” is too vague for formative evidence.

## Assessment
### Recognition
:::exercise Identify a justified strategy
A class has five learners who can perform an operation but cannot explain why it works. Which approach is most defensible?
:::answer
Use prediction and explanation supported by contrasting examples. The goal is conceptual transfer, so explanation and revision reveal more than another repetition drill.
:::end

### Procedure
:::exercise Plan a short sequence
Write a three-step sequence for teaching a new subject term.
:::answer
One defensible sequence is: display an accurate example and non-example, ask learners to explain which is which, then use a short exit question that requires the term in a new context.
:::end

### Error correction
:::exercise Correct a resource-heavy plan
A teacher has 12 colourful slides but no check of understanding. What should change?
:::answer
Keep only representations that serve the learning goal and add prediction or explanation at points where misconceptions could be diagnosed.
:::end

### Transfer
:::exercise Choose a support
Two learners produce the correct answer but use different methods. What is a useful next move?
:::answer
Ask each to explain their reasoning and compare when the methods are valid. This protects mathematical or subject accuracy while valuing an accessible route.
:::end

## Pause and Predict
:::exercise Diagnose the mistake
A teacher finishes a lesson with a 40-item worksheet but does not inspect responses until the next day. What is limited?
:::answer
The activity may provide practice, but delayed feedback prevents immediate correction and gives little formative evidence for revising the next lesson.
:::end`,
    },
  ],
};
