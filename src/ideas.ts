import { randomUUID } from "node:crypto";

export type IdeaFeature = {
  id: string;
  content: string;
  createdAt: string;
};

export type Idea = {
  id: string;
  title: string;
  summary?: string;
  features: IdeaFeature[];
  createdAt: string;
  updatedAt: string;
};

type FeatureOptions = {
  timestamp?: string;
  idFactory?: () => string;
};

type FormatOptions = {
  formatDate?: (iso: string) => string;
};

export function createFeaturesFromText(block?: string, options: FeatureOptions = {}): IdeaFeature[] {
  const text = block?.trim();
  if (!text) {
    return [];
  }

  const timestamp = options.timestamp ?? new Date().toISOString();
  const makeId = options.idFactory ?? randomUUID;

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((content) => ({
      id: makeId(),
      content,
      createdAt: timestamp,
    }));
}

export function formatAbsoluteDate(dateISO: string): string {
  return new Date(dateISO).toLocaleString();
}

export function formatIdeaMarkdown(idea: Idea, options: FormatOptions = {}): string {
  const formatDate = options.formatDate ?? formatAbsoluteDate;
  const lines = [`# ${idea.title}`, ""];

  if (idea.summary) {
    lines.push(idea.summary, "");
  }

  lines.push(`- Created: ${formatDate(idea.createdAt)}`);
  lines.push(`- Updated: ${formatDate(idea.updatedAt)}`, "");

  if (idea.features.length) {
    lines.push("## Features", "");
    for (const feature of idea.features) {
      lines.push(`- ${feature.content}`);
    }
  } else {
    lines.push("_No features captured yet._");
  }

  return lines.join("\n");
}

export function formatIdeasMarkdown(ideas: Idea[], options: FormatOptions = {}): string {
  if (ideas.length === 0) {
    return "_No ideas captured yet._";
  }
  return ideas.map((idea) => formatIdeaMarkdown(idea, options)).join("\n\n---\n\n");
}
