import { describe, expect, it } from "vitest";
import {
  Idea,
  createFeaturesFromText,
  createIdea,
  formatIdeaMarkdown,
  formatIdeasMarkdown,
  mergeFeatureBodies,
  parseTagsInput,
} from "./ideas";

describe("createFeaturesFromText", () => {
  it("returns an empty array when no content provided", () => {
    expect(createFeaturesFromText(undefined)).toEqual([]);
    expect(createFeaturesFromText("   ")).toEqual([]);
  });

  it("splits lines, trims whitespace, and assigns ids", () => {
    let counter = 0;
    const idFactory = () => {
      counter += 1;
      return `feature-${counter}`;
    };

    const features = createFeaturesFromText("Signup flow  \n\n  Analytics dashboard\n", {
      timestamp: "2025-01-01T00:00:00.000Z",
      idFactory,
    });

    expect(features).toEqual([
      { id: "feature-1", content: "Signup flow", createdAt: "2025-01-01T00:00:00.000Z" },
      { id: "feature-2", content: "Analytics dashboard", createdAt: "2025-01-01T00:00:00.000Z" },
    ]);
  });
});

describe("createIdea", () => {
  it("generates default values and trims summary", () => {
    const idea = createIdea({
      title: "   New Idea   ",
      summary: "  Summary text  ",
      tags: ["design"],
      idFactory: () => "idea-123",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
    });

    expect(idea).toEqual({
      id: "idea-123",
      title: "   New Idea   ",
      summary: "Summary text",
      tags: ["design"],
      isPinned: false,
      isArchived: false,
      features: [],
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
    });
  });
});

describe("mergeFeatureBodies", () => {
  const baseFeatures = [
    { id: "feature-1", content: "Prototype", createdAt: "2025-01-01T00:00:00.000Z" },
    { id: "feature-2", content: "User testing", createdAt: "2025-01-02T00:00:00.000Z" },
  ];

  it("updates existing entries and appends new ones while preserving metadata", () => {
    let counter = 0;
    const idFactory = () => {
      counter += 1;
      return `feature-new-${counter}`;
    };

    const result = mergeFeatureBodies(baseFeatures, [" Prototype plan  ", "User testing", "Launch"], {
      timestamp: "2025-02-01T00:00:00.000Z",
      idFactory,
    });

    expect(result).toEqual([
      { id: "feature-1", content: "Prototype plan", createdAt: "2025-01-01T00:00:00.000Z" },
      { id: "feature-2", content: "User testing", createdAt: "2025-01-02T00:00:00.000Z" },
      { id: "feature-new-1", content: "Launch", createdAt: "2025-02-01T00:00:00.000Z" },
    ]);
  });

  it("drops empty entries and returns empty array when everything removed", () => {
    const result = mergeFeatureBodies(baseFeatures, ["   ", ""], { timestamp: "2025-02-01T00:00:00.000Z" });
    expect(result).toEqual([]);
  });

  it("does not mutate the original features array", () => {
    const snapshot = JSON.parse(JSON.stringify(baseFeatures));
    mergeFeatureBodies(baseFeatures, ["Prototype"], { timestamp: "2025-02-01T00:00:00.000Z" });
    expect(baseFeatures).toEqual(snapshot);
  });
});

describe("formatIdeaMarkdown", () => {
  const stubFormatDate = (iso: string) => `formatted-${iso}`;

  it("builds markdown with summary and features", () => {
    const idea: Idea = {
      id: "idea-1",
      title: "Launch Companion App",
      summary: "Mobile app to support core desktop product.",
      tags: ["mobile", "retention"],
      isPinned: true,
      isArchived: false,
      features: [
        { id: "feature-1", content: "Realtime sync", createdAt: "2025-01-01T00:00:00.000Z" },
        { id: "feature-2", content: "Push notifications", createdAt: "2025-01-01T00:00:00.000Z" },
      ],
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-02T12:00:00.000Z",
    };

    expect(formatIdeaMarkdown(idea, { formatDate: stubFormatDate })).toBe(
      [
        "# Launch Companion App",
        "",
        "Mobile app to support core desktop product.",
        "",
        "**Status:** Pinned",
        "",
        "**Tags:** mobile, retention",
        "",
        "- Created: formatted-2025-01-01T00:00:00.000Z",
        "- Updated: formatted-2025-01-02T12:00:00.000Z",
        "",
        "## Features",
        "",
        "- Realtime sync",
        "- Push notifications",
      ].join("\n"),
    );
  });

  it("falls back to placeholder when there are no features", () => {
    const idea: Idea = {
      id: "idea-2",
      title: "Empty Idea",
      summary: undefined,
      tags: [],
      isPinned: false,
      isArchived: true,
      features: [],
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };

    expect(formatIdeaMarkdown(idea, { formatDate: stubFormatDate })).toBe(
      [
        "# Empty Idea",
        "",
        "**Status:** Archived",
        "",
        "- Created: formatted-2025-01-01T00:00:00.000Z",
        "- Updated: formatted-2025-01-01T00:00:00.000Z",
        "",
        "_No features captured yet._",
      ].join("\n"),
    );
  });
});

describe("formatIdeasMarkdown", () => {
  const sampleIdeas: Idea[] = [
    {
      id: "idea-1",
      title: "Idea One",
      summary: undefined,
      tags: ["ops"],
      isPinned: false,
      isArchived: false,
      features: [],
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "idea-2",
      title: "Idea Two",
      summary: undefined,
      tags: [],
      isPinned: false,
      isArchived: false,
      features: [],
      createdAt: "2025-01-02T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
    },
  ];

  it("joins multiple ideas with separators", () => {
    const result = formatIdeasMarkdown(sampleIdeas, { formatDate: (iso) => iso });

    expect(result).toBe(
      [
        "# Idea One",
        "",
        "**Status:** Active",
        "",
        "**Tags:** ops",
        "",
        "- Created: 2025-01-01T00:00:00.000Z",
        "- Updated: 2025-01-01T00:00:00.000Z",
        "",
        "_No features captured yet._",
        "",
        "---",
        "",
        "# Idea Two",
        "",
        "**Status:** Active",
        "",
        "- Created: 2025-01-02T00:00:00.000Z",
        "- Updated: 2025-01-02T00:00:00.000Z",
        "",
        "_No features captured yet._",
      ].join("\n"),
    );
  });

  it("returns placeholder when no ideas exist", () => {
    expect(formatIdeasMarkdown([], { formatDate: (iso) => iso })).toBe("_No ideas captured yet._");
  });
});

describe("parseTagsInput", () => {
  it("returns empty array for undefined or empty input", () => {
    expect(parseTagsInput()).toEqual([]);
    expect(parseTagsInput("   ")).toEqual([]);
  });

  it("splits and trims comma separated tags", () => {
    expect(parseTagsInput("growth,  mobile ,  B2B")).toEqual(["growth", "mobile", "B2B"]);
  });
});
