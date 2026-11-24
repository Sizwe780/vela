export const teachingFrameworkIds = [
  "educator_roles", "teaching_philosophy", "instruction_choices", "tpack", "reflection_cycle", "learning_community",
] as const;

type FrameworkStep = { title: string; meaning: string; example: string };
type Framework = { title: string; prompt: string; attribution: string; source?: string; sequence?: boolean; steps: FrameworkStep[] };

export const teachingFrameworks: Record<(typeof teachingFrameworkIds)[number], Framework> = {
  educator_roles: {
    title: "Seven roles in a school",
    prompt: "Explore how each role can show up when a class studies water use in its community.",
    attribution: "DHET, Minimum Requirements for Teacher Education Qualifications, Appendix A",
    source: "https://www.dhet.gov.za/Part%20C%20%20Policies/HIGHER%20EDUCATION/17.%20Revised%20Policy%20on%20the%20minimum%20requirements%20for%20teacher%20eucation%20qualification.pdf",
    steps: [
      { title: "Subject specialist", meaning: "Use accurate phase and subject knowledge.", example: "Explain the difference between a limited water supply and unequal access to that supply." },
      { title: "Learning mediator", meaning: "Make disciplinary ideas accessible through suitable representations.", example: "Help learners connect the bars on a water-use chart to quantities they can explain in their own words." },
      { title: "Learning designer", meaning: "Adapt materials and learning programmes for the classroom.", example: "Produce a readable chart and a text equivalent with the same evidence and reasoning task." },
      { title: "Leader and manager", meaning: "Organise people, time and resources for learning.", example: "Plan how groups will share one measuring set and rotate through meaningful roles." },
      { title: "Researcher and lifelong learner", meaning: "Investigate practice and improve it with colleagues.", example: "Compare two anonymised response patterns with a colleague and redesign the next lesson’s opening." },
      { title: "Assessor", meaning: "Gather and interpret evidence against an explicit criterion.", example: "Ask each learner to justify a chart-based claim and distinguish a reading error from a reasoning error." },
      { title: "Community and pastoral role", meaning: "Support learner welfare, participation and responsible citizenship within school procedures.", example: "Offer a fictional household dataset so learners can participate without sharing private family circumstances." },
    ],
  },
  teaching_philosophy: {
    title: "From teaching belief to classroom evidence",
    prompt: "Follow two teaching commitments into the same classroom. Which evidence would justify changing your approach?",
    attribution: "Vela teaching comparison using a fictional class",
    steps: [
      { title: "Build on prior thinking", meaning: "A constructivist commitment makes learners’ initial explanations visible so they can revise them.", example: "Ask learners whether equal perimeters must give equal areas. Compare two counterexamples and invite a revised explanation." },
      { title: "Make the procedure explicit", meaning: "Explicit instruction models the reasoning and makes the success criterion visible.", example: "Think aloud while constructing a rectangle with a fixed perimeter, then fade prompts on a new rectangle." },
      { title: "Combine and test", meaning: "A philosophy should guide conditional choices and be revised when evidence warrants it.", example: "Elicit predictions, model the first comparison, then ask for an independently justified counterexample." },
    ],
  },
  instruction_choices: {
    title: "Match the strategy to the evidence",
    prompt: "The goal stays fixed: each learner must explain why a claim follows from the evidence.",
    attribution: "Vela decision guide using fictional learner responses",
    steps: [
      { title: "Model a missing move", meaning: "Use explicit modelling when learners lack a prerequisite reasoning step.", example: "Show how one data point supports a claim, then give a different point for independent practice." },
      { title: "Compare competing ideas", meaning: "Use structured discussion when learners can give evidence but interpret it differently.", example: "Give each learner a written claim first. In pairs, compare the evidence before revising the claim independently." },
      { title: "Investigate a pattern", meaning: "Use guided inquiry when learners have enough prior knowledge to interpret the evidence.", example: "Provide contrasting cases and a recording template. Check whether each learner can justify a pattern without the group." },
    ],
  },
  tpack: {
    title: "Design at the intersection of TPACK",
    prompt: "Use the three lenses on a task about interpreting how a quantity changes over time.",
    attribution: "Mishra and Koehler, Technological Pedagogical Content Knowledge (2006)",
    source: "https://doi.org/10.1111/j.1467-9620.2006.00684.x",
    steps: [
      { title: "Content", meaning: "Identify the idea and its likely misconception.", example: "Learners must distinguish the height of a graph from its rate of change." },
      { title: "Pedagogy", meaning: "Choose a teaching move that reveals learners’ thinking.", example: "Ask learners to predict which interval changes fastest and explain their choice before comparison." },
      { title: "Technology", meaning: "Identify what the tool makes possible and what it costs in access or attention.", example: "A graphing tool can compare two intervals with a slider. It also needs an accessible control and a printable fallback." },
      { title: "Combine the lenses", meaning: "Design one activity where the tool supports the teaching move and the specific subject idea.", example: "Compare the same intervals digitally or on paper, then mark a short explanation that distinguishes height from slope." },
    ],
  },
  reflection_cycle: {
    title: "Gibbs’ reflective cycle",
    prompt: "Work through a group activity where a confident spokesperson made it difficult to see what others understood.",
    attribution: "Adapted from Graham Gibbs, Learning by Doing (1988). Fictional Vela case.",
    source: "https://radar.brookes.ac.uk/radar/file/a7e1f738-c0a2-47b5-8ab7-95b8973cdbf9/1/Learning%20by%20doing%20-%20Graham%20Gibbs.pdf",
    sequence: true,
    steps: [
      { title: "Description", meaning: "Record what happened in observable terms.", example: "Four groups presented. The same learner spoke for each group throughout its presentation." },
      { title: "Feelings", meaning: "Notice how your interpretation and emotions affected decisions.", example: "I felt reassured by fluent presentations and stopped asking quieter learners for their reasoning." },
      { title: "Evaluation", meaning: "Identify what helped and what remained uncertain.", example: "The group produced an explanation. Individual understanding was still unclear." },
      { title: "Analysis", meaning: "Connect evidence to possible causes and consider alternatives.", example: "The reporting structure concentrated talk. It is also possible that others understood but preferred to write." },
      { title: "Conclusion", meaning: "Name a specific practice you should keep or change.", example: "Keep the group discussion and add an individual response before presentations." },
      { title: "Action plan", meaning: "Set a small change and decide how you will judge its effect.", example: "In the next lesson, compare anonymous individual explanations from before and after discussion against the same criterion." },
    ],
  },
  learning_community: {
    title: "Turn feedback into a shared teaching trial",
    prompt: "Move through a short lesson-study cycle. Follow what a colleague observes and what evidence the next lesson should collect.",
    attribution: "Original Vela example · fictional evidence",
    sequence: true,
    steps: [
      { title: "Agree on the evidence", meaning: "Choose a single learning question and agree what reasoning to look for.", example: "Can each learner justify why the shaded areas match?" },
      { title: "Observe the lesson", meaning: "Record descriptions tied to the learning question.", example: "Collect a tally of independent explanations without names or identifying work samples." },
      { title: "Compare interpretations", meaning: "Bring an alternative account and state what the evidence cannot decide.", example: "Some learners may have identified the area relationship but found the explanation hard to write." },
      { title: "Test one change", meaning: "Design one adjustment and a comparable test for the next lesson.", example: "Offer an oral explanation option and compare the underlying reasoning with the same criterion." },
    ],
  },
};
