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
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  features: IdeaFeature[];
  createdAt: string;
  updatedAt: string;
};

export const IDEAS_STORAGE_KEY = "raycast-idea-tracker/ideas";

type FeatureOptions = {
  timestamp?: string;
  idFactory?: () => string;
};

type FormatOptions = {
  formatDate?: (iso: string) => string;
};

type CreateIdeaParams = {
  title: string;
  summary?: string;
  tags?: string[];
  features?: IdeaFeature[];
  createdAt?: string;
  updatedAt?: string;
  idFactory?: () => string;
  isPinned?: boolean;
  isArchived?: boolean;
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

export function mergeFeatureBodies(
  existingFeatures: IdeaFeature[],
  featureBodies: string[],
  options: FeatureOptions = {},
): IdeaFeature[] {
  const trimmedBodies = featureBodies.map((body) => body.trim()).filter(Boolean);
  if (trimmedBodies.length === 0) {
    return [];
  }

  const timestamp = options.timestamp ?? new Date().toISOString();
  const makeId = options.idFactory ?? randomUUID;

  return trimmedBodies.map((content, index) => {
    const existing = existingFeatures[index];
    if (existing) {
      return { ...existing, content };
    }
    return {
      id: makeId(),
      content,
      createdAt: timestamp,
    };
  });
}

export function parseTagsInput(input?: string): string[] {
  if (!input) {
    return [];
  }
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export function createIdea(params: CreateIdeaParams): Idea {
  const makeId = params.idFactory ?? randomUUID;
  const createdAt = params.createdAt ?? new Date().toISOString();
  const updatedAt = params.updatedAt ?? createdAt;
  return {
    id: makeId(),
    title: params.title,
    summary: params.summary?.trim() || undefined,
    tags: params.tags ?? [],
    isPinned: params.isPinned ?? false,
    isArchived: params.isArchived ?? false,
    features: params.features ?? [],
    createdAt,
    updatedAt,
  };
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

  lines.push(`**Status:** ${idea.isArchived ? "Archived" : idea.isPinned ? "Pinned" : "Active"}`);
  lines.push("");

  if (idea.tags.length > 0) {
    lines.push(`**Tags:** ${idea.tags.join(", ")}`, "");
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

export type StoredIdea = Omit<Idea, "tags" | "features" | "isPinned" | "isArchived"> & {
  tags?: string[];
  features?: Idea["features"];
  isPinned?: boolean;
  isArchived?: boolean;
};

export function normalizeIdea(idea: StoredIdea): Idea {
  return {
    ...idea,
    tags: idea.tags ?? [],
    features: idea.features ?? [],
    isPinned: idea.isPinned ?? false,
    isArchived: idea.isArchived ?? false,
  };
}

export type MarkdownImportProject = {
  title: string;
  features: string[];
};

export function parseIdeasFromMarkdown(markdown: string): MarkdownImportProject[] {
  const projects: MarkdownImportProject[] = [];
  const lines = markdown.split(/\r?\n/);

  let currentTitle: string | null = null;
  let currentFeatures: string[] = [];

  const pushCurrent = () => {
    if (currentTitle) {
      projects.push({
        title: currentTitle,
        features: currentFeatures.map((feature) => feature.trim()).filter(Boolean),
      });
    }
    currentTitle = null;
    currentFeatures = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      pushCurrent();
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s*(.+)$/);
    if (bulletMatch) {
      const content = bulletMatch[1].trim();
      if (!currentTitle) {
        currentTitle = "Untitled Project";
      }
      currentFeatures.push(content);
      continue;
    }

    const headingMatch = line.match(/^#+\s*(.+)$/);
    const potentialTitle = headingMatch ? headingMatch[1].trim() : line;

    if (currentTitle || currentFeatures.length > 0) {
      pushCurrent();
    }

    currentTitle = potentialTitle || "Untitled Project";
  }

  pushCurrent();

  return projects.filter((project) => project.title.length > 0 && (project.features.length > 0 || project.title));
}
