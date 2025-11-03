import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { confirmAlert, showToast } from "@raycast/api";
import { __resetStorage } from "@raycast/utils";
import { useIdeasManager } from "./use-ideas-manager";

describe("useIdeasManager", () => {
  beforeEach(() => {
    showToast.mockReset();
    confirmAlert.mockReset();
    confirmAlert.mockResolvedValue(true);
    __resetStorage();
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
});
