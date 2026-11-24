import type { StructuredDocument } from "../content/structured";
import type { UIMessage } from "ai";

export type TutorMode = "academic" | "pck";
export type TutorPace = "normal" | "transfer";
export type Citation = {
  label: string;
  chunkId: string;
  title: string;
  excerpt: string;
  url: string;
  similarity: number;
  sourceUrl?: string;
  criterion: {
    id: string;
    code: string;
    description: string;
    sourceUrl: string;
    saqaId: string;
    authority?: string;
  };
};
export type TutorMessage = UIMessage<
  never,
  {
    citations: {
      sources: Citation[];
      mode: TutorMode;
      preview: boolean;
      strategy?: "debate";
      hintTier?: number;
      refresher?: { title: string; href: string };
    };
  }
>;
export type StudyChunk = {
  id: string;
  title: string;
  body: string;
  documentId?: string | null;
  criterionCode: string | null;
  criterionDescription: string | null;
  criterionSourceUrl: string | null;
  criterionAuthority?: string;
  sourceUrl?: string | null;
};
export type StudyUnitView = {
  capabilities?: import("../capabilities").ModuleCapabilities;
  id: string;
  code: string;
  title: string;
  position: number;
  moduleId?: string;
  moduleCode: string;
  moduleTitle: string;
  preview: boolean;
  sessions?: {
    id: string;
    title: string;
    markdown: string;
    visual: string | null;
    position: number;
    version?: number;
  }[];
  moduleInfo?: {
    nqfLevel: number;
    credits: number;
    delivery: string;
    scopeNote: string;
    extractionNote: string;
    sources: { label: string; url: string }[];
    conversion?: { total: number; converted: number; needsReview: number };
  };
  outcomes: { id: string; code: string; description: string }[];
  documents: {
    id: string;
    title: string;
    text: string;
    ingestionIds?: string[];
    structuredContent?: StructuredDocument;
  }[];
  chunks: StudyChunk[];
};
