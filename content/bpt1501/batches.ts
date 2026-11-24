import { professionalRoles } from "./professional-roles";
import { professionalPhilosophy } from "./professional-philosophy";
import { teachingStrategies } from "./teaching-strategies";
import { technologyInnovation } from "./technology-innovation";
import { teacherPortfolio } from "./teacher-portfolio";

export const bpt1501Source = {
  moduleCode: "BPT1501",
  title: "Being a Professional Teacher",
  institution: "UNISA",
  sourceScope:
    "Vela teaching sequence based on a historical UNISA topic outline and professional references. Current official assessment details await verification.",
  excludedFromSourceClaim: [
    "AI-generated or unverified current dates",
    "unconfirmed examination pass rules or undisclosed assignment rules",
    "claimed source-line citations without the original 2026 page reference",
    "2018 assignment due dates",
    "2018 unique numbers",
    "2018 weight allocations",
    "old myUnisa screenshots",
  ],
  units: [
    {
      code: "BPT1501-U2",
      title: "The teacher as a professional",
      position: 2,
      outcome:
        "Explain professional teaching roles, ethics and the developing context of South African education.",
    },
    {
      code: "BPT1501-U3",
      title: "Teaching and learning philosophies",
      position: 3,
      outcome:
        "Develop a coherent personal teaching philosophy and explain its relationship to a learning community.",
    },
    {
      code: "BPT1501-U4",
      title: "Multiple teaching and learning strategies",
      position: 4,
      outcome:
        "Select and justify teaching strategies for diverse learners, subjects and learning intentions.",
    },
    {
      code: "BPT1501-U5",
      title: "Integrated and innovative teaching",
      position: 5,
      outcome:
        "Design accessible technology-supported learning that addresses a justified teaching need.",
    },
    {
      code: "BPT1501-U6",
      title: "Consolidation and reflective practice",
      position: 6,
      outcome:
        "Synthesize professional identity, philosophy, inclusive strategy and ICT practice through reflective evidence of teaching impact.",
    },
  ],
};

export const bpt1501Batches = [
  {
    unit: professionalRoles,
    position: 2,
    outcome: bpt1501Source.units[0].outcome,
  },
  {
    unit: professionalPhilosophy,
    position: 3,
    outcome: bpt1501Source.units[1].outcome,
  },
  {
    unit: teachingStrategies,
    position: 4,
    outcome: bpt1501Source.units[2].outcome,
  },
  {
    unit: technologyInnovation,
    position: 5,
    outcome: bpt1501Source.units[3].outcome,
  },
  {
    unit: teacherPortfolio,
    position: 6,
    outcome: bpt1501Source.units[4].outcome,
  },
];
