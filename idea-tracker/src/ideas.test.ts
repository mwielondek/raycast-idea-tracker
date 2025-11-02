import { describe, expect, it } from "vitest";
import {
  Idea,
  createFeaturesFromText,
  formatIdeaMarkdown,
  formatIdeasMarkdown,
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

describe("formatIdeaMarkdown", () => {
  const stubFormatDate = (iso: string) => `formatted-${iso}`;

  it("builds markdown with summary and features", () => {
    const idea: Idea = {
      id: "idea-1",
      title: "Launch Companion App",
      summary: "Mobile app to support core desktop product.",
      features: [
        { id: "feature-1", content: "Realtime sync", createdAt: "2025-01-01T00:00:00.000Z" },
        { id: "feature-2", content: "Push notifications", createdAt: "2025-01-01T00:00:00.000Z" },
      ],
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-02T12:00:00.000Z",
    };

    expect(
      formatIdeaMarkdown(idea, { formatDate: stubFormatDate })
    ).toBe(
      [
        "# Launch Companion App",
        "",
        "Mobile app to support core desktop product.",
        "",
        "- Created: formatted-2025-01-01T00:00:00.000Z",
        "- Updated: formatted-2025-01-02T12:00:00.000Z",
        "",
        "## Features",
        "",
        "- Realtime sync",
        "- Push notifications",
      ].join("\n")
    );
  });

  it("falls back to placeholder when there are no features", () => {
    const idea: Idea = {
      id: "idea-2",
      title: "Empty Idea",
      summary: undefined,
      features: [],
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };

    expect(formatIdeaMarkdown(idea, { formatDate: stubFormatDate })).toBe(
      [
        "# Empty Idea",
        "",
        "- Created: formatted-2025-01-01T00:00:00.000Z",
        "- Updated: formatted-2025-01-01T00:00:00.000Z",
        "",
        "_No features captured yet._",
      ].join("\n")
    );
  });
});

describe("formatIdeasMarkdown", () => {
  const sampleIdeas: Idea[] = [
    {
      id: "idea-1",
      title: "Idea One",
      summary: undefined,
      features: [],
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "idea-2",
      title: "Idea Two",
      summary: undefined,
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
        "- Created: 2025-01-01T00:00:00.000Z",
        "- Updated: 2025-01-01T00:00:00.000Z",
        "",
        "_No features captured yet._",
        "",
        "---",
        "",
        "# Idea Two",
        "",
        "- Created: 2025-01-02T00:00:00.000Z",
        "- Updated: 2025-01-02T00:00:00.000Z",
        "",
        "_No features captured yet._",
      ].join("\n")
    );
  });

  it("returns placeholder when no ideas exist", () => {
    expect(formatIdeasMarkdown([], { formatDate: (iso) => iso })).toBe("_No ideas captured yet._");
  });
});
