import { Detail, Toast, showToast } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { IDEAS_STORAGE_KEY, Idea, createFeaturesFromText, createIdea, parseTagsInput } from "./ideas";
import { AddProjectForm, ProjectFormValues } from "./list-projects";

export default function AddProjectCommand() {
  const { value: storedProjects, setValue: setProjects, isLoading } = useLocalStorage<Idea[]>(IDEAS_STORAGE_KEY, []);

  async function handleSubmit(values: ProjectFormValues): Promise<boolean> {
    const title = values.title?.trim();
    if (!title) {
      await showToast(Toast.Style.Failure, "Project name is required");
      return false;
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
      return true;
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to add project", String(error));
      return false;
    }
  }

  if (isLoading) {
    return <Detail isLoading />;
  }

  return <AddProjectForm onSubmit={handleSubmit} />;
}
