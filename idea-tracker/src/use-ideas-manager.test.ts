import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirmAlert, showToast } from "@raycast/api";
import { __resetStorage } from "@raycast/utils";
import { useIdeasManager } from "./use-ideas-manager";
import { readFile } from "node:fs/promises";

vi.mock("node:fs/promises", () => {
  const readFileMock = vi.fn();
  return {
    readFile: readFileMock,
    default: { readFile: readFileMock },
  };
});

const readFileMock = readFile as unknown as vi.Mock;

describe("useIdeasManager", () => {
  beforeEach(() => {
    showToast.mockReset();
    confirmAlert.mockReset();
    confirmAlert.mockResolvedValue(true);
    __resetStorage();
    readFileMock.mockReset();
  });

  it("creates a project with normalized fields", async () => {
    const { result } = renderHook(() => useIdeasManager());

    await act(async () => {
      const created = await result.current.createProject({
        title: "Launch App",
        summary: "  Build MVP  ",
        tags: "alpha, beta",
        initialFeatures: "Signup flow\n\nAnalytics dashboard",
      });
      expect(created).not.toBeNull();
    });

    expect(result.current.projects).toHaveLength(1);
    const project = result.current.projects[0];
    expect(project.summary).toBe("Build MVP");
    expect(project.tags).toEqual(["alpha", "beta"]);
    expect(project.features.map((feature) => feature.content)).toEqual(["Signup flow", "Analytics dashboard"]);
    expect(showToast).toHaveBeenCalledWith("success", "Project added", "Launch App");
  });

  it("appends features to an existing project", async () => {
    const { result } = renderHook(() => useIdeasManager());
    await act(async () => {
      await result.current.createProject({ title: "Docs Overhaul" });
    });
    const projectId = result.current.projects[0].id;

    await act(async () => {
      const updated = await result.current.appendFeature(projectId, "Rewrite onboarding");
      expect(updated?.features.map((feature) => feature.content)).toContain("Rewrite onboarding");
    });

    expect(result.current.projects[0].features.map((feature) => feature.content)).toContain("Rewrite onboarding");
  });

  it("archives projects and clears pins", async () => {
    const { result } = renderHook(() => useIdeasManager());
    await act(async () => {
      await result.current.createProject({ title: "Growth Loop" });
    });
    const projectId = result.current.projects[0].id;

    await act(async () => {
      await result.current.togglePin(projectId, true);
    });
    expect(result.current.projects[0].isPinned).toBe(true);

    await act(async () => {
      await result.current.toggleArchive(projectId, true);
    });

    const archived = result.current.projects[0];
    expect(archived.isArchived).toBe(true);
    expect(archived.isPinned).toBe(false);
  });

  it("deletes projects after confirmation", async () => {
    confirmAlert.mockResolvedValueOnce(true);
    const { result } = renderHook(() => useIdeasManager());
    await act(async () => {
      await result.current.createProject({ title: "Delete Me" });
    });

    const projectId = result.current.projects[0].id;

    await act(async () => {
      await result.current.deleteProject(projectId);
    });

    expect(confirmAlert).toHaveBeenCalled();
    expect(result.current.projects).toHaveLength(0);
  });

  it("imports projects from a markdown file", async () => {
    const markdown = [
      "# Launch Companion App",
      "- Realtime sync",
      "- Push notifications",
      "",
      "Growth Experiments",
      "* Referral program",
    ].join("\n");

    readFileMock.mockResolvedValueOnce(markdown);

    const { result } = renderHook(() => useIdeasManager());

    await act(async () => {
      const imported = await result.current.importProjectsFromMarkdown("/tmp/projects.md");
      expect(imported).toBe(2);
    });

    expect(result.current.projects).toHaveLength(2);
    expect(result.current.projects[0].title).toBe("Launch Companion App");
    expect(result.current.projects[0].features.map((feature) => feature.content)).toEqual([
      "Realtime sync",
      "Push notifications",
    ]);
    expect(showToast).toHaveBeenCalledWith("success", "Imported 2 projects", undefined);
  });
});
