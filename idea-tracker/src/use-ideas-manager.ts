import { Alert, Toast, confirmAlert, showToast } from "@raycast/api";
import { useCallback, useMemo } from "react";
import { useLocalStorage } from "@raycast/utils";
import {
  IDEAS_STORAGE_KEY,
  Idea,
  createFeaturesFromText,
  createIdea,
  mergeFeatureBodies,
  normalizeIdea,
  parseTagsInput,
} from "./ideas";
import { ProjectFormValues } from "./project-form-types";

export function useIdeasManager() {
  const { value: storedProjects, setValue: setProjects, isLoading } = useLocalStorage<Idea[]>(IDEAS_STORAGE_KEY, []);

  const projects = useMemo(() => {
    return [...(storedProjects ?? []).map(normalizeIdea)].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [storedProjects]);

  const createProject = useCallback(
    async (values: ProjectFormValues): Promise<Idea | null> => {
      const title = values.title?.trim();
      if (!title) {
        await showToast(Toast.Style.Failure, "Project name is required");
        return null;
      }

      const now = new Date().toISOString();
      const tags = parseTagsInput(values.tags);
      const features = createFeaturesFromText(values.initialFeatures);
      const nextProject = createIdea({
        title,
        summary: values.summary,
        tags,
        features,
        createdAt: now,
        updatedAt: now,
      });

      try {
        await setProjects([nextProject, ...(storedProjects ?? [])]);
        await showToast(Toast.Style.Success, "Project added", title);
        return normalizeIdea(nextProject);
      } catch (error) {
        await showToast(Toast.Style.Failure, "Failed to add project", String(error));
        return null;
      }
    },
    [setProjects, storedProjects],
  );

  const updateProject = useCallback(
    async (projectId: string, values: ProjectFormValues): Promise<Idea | null> => {
      const title = values.title?.trim();
      if (!title) {
        await showToast(Toast.Style.Failure, "Project name is required");
        return null;
      }

      const tags = parseTagsInput(values.tags);
      const now = new Date().toISOString();

      const updated = (storedProjects ?? []).map((project) => {
        if (project.id !== projectId) {
          return project;
        }
        return {
          ...project,
          title,
          summary: values.summary?.trim() || undefined,
          tags,
          updatedAt: now,
        };
      });

      await setProjects(updated);
      await showToast(Toast.Style.Success, "Project updated");
      const updatedProject = updated.find((project) => project.id === projectId);
      return updatedProject ? normalizeIdea(updatedProject) : null;
    },
    [setProjects, storedProjects],
  );

  const appendFeature = useCallback(
    async (projectId: string, featureText: string): Promise<Idea | null> => {
      const trimmed = featureText.trim();
      if (!trimmed) {
        await showToast(Toast.Style.Failure, "Feature text cannot be empty");
        return null;
      }

      const existing = storedProjects ?? [];
      const project = existing.find((item) => item.id === projectId);
      if (!project) {
        await showToast(Toast.Style.Failure, "Project not found");
        return null;
      }

      if (project.isArchived) {
        await showToast(Toast.Style.Failure, "Project is archived");
        return null;
      }

      const now = new Date().toISOString();
      const newFeatures = createFeaturesFromText(trimmed, { timestamp: now });
      if (newFeatures.length === 0) {
        return null;
      }

      const updatedProjects = existing.map((item) => {
        if (item.id !== projectId) {
          return item;
        }

        return {
          ...item,
          features: [...item.features, ...newFeatures],
          updatedAt: now,
        };
      });

      await setProjects(updatedProjects);
      await showToast(Toast.Style.Success, "Feature appended");
      const updatedProject = updatedProjects.find((item) => item.id === projectId);
      return updatedProject ? normalizeIdea(updatedProject) : null;
    },
    [setProjects, storedProjects],
  );

  const editFeatures = useCallback(
    async (projectId: string, featureBodies: string[]): Promise<Idea | null> => {
      const existing = storedProjects ?? [];
      const project = existing.find((item) => item.id === projectId);
      if (!project) {
        await showToast(Toast.Style.Failure, "Project not found");
        return null;
      }

      if (project.isArchived) {
        await showToast(Toast.Style.Failure, "Project is archived");
        return null;
      }

      const now = new Date().toISOString();
      const updatedFeatures = mergeFeatureBodies(project.features, featureBodies, { timestamp: now });
      const hasChanges =
        updatedFeatures.length !== project.features.length ||
        updatedFeatures.some((feature, index) => project.features[index]?.content !== feature.content);
      const updatedProjects = existing.map((item) => {
        if (item.id !== projectId) {
          return item;
        }
        return {
          ...item,
          features: updatedFeatures,
          updatedAt: hasChanges ? now : item.updatedAt,
        };
      });

      await setProjects(updatedProjects);
      await showToast(Toast.Style.Success, "Features updated");
      const updatedProject = updatedProjects.find((item) => item.id === projectId);
      return updatedProject ? normalizeIdea(updatedProject) : null;
    },
    [setProjects, storedProjects],
  );

  const togglePin = useCallback(
    async (projectId: string, pin: boolean) => {
      const now = new Date().toISOString();
      const updated = (storedProjects ?? []).map((item) => {
        if (item.id !== projectId) {
          return item;
        }
        return {
          ...item,
          isPinned: pin,
          isArchived: pin ? false : (item.isArchived ?? false),
          updatedAt: now,
        };
      });

      await setProjects(updated);
      await showToast(Toast.Style.Success, pin ? "Project pinned" : "Project unpinned");
    },
    [setProjects, storedProjects],
  );

  const toggleArchive = useCallback(
    async (projectId: string, archive: boolean) => {
      const now = new Date().toISOString();
      const updated = (storedProjects ?? []).map((item) => {
        if (item.id !== projectId) {
          return item;
        }
        return {
          ...item,
          isArchived: archive,
          isPinned: archive ? false : (item.isPinned ?? false),
          updatedAt: now,
        };
      });

      await setProjects(updated);
      await showToast(Toast.Style.Success, archive ? "Project archived" : "Project restored");
    },
    [setProjects, storedProjects],
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      const confirmed = await confirmAlert({
        title: "Delete project?",
        message: "This will permanently remove the project and all captured features.",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      });

      if (!confirmed) {
        return;
      }

      const next = (storedProjects ?? []).filter((item) => item.id !== projectId);
      await setProjects(next);
      await showToast(Toast.Style.Success, "Project deleted");
    },
    [setProjects, storedProjects],
  );

  return {
    isLoading,
    projects,
    rawProjects: storedProjects ?? [],
    createProject,
    updateProject,
    appendFeature,
    editFeatures,
    togglePin,
    toggleArchive,
    deleteProject,
  };
}
