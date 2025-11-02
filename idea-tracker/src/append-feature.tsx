import { Action, ActionPanel, Detail, Icon, LaunchType, Toast, launchCommand, showToast } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import {
  IDEAS_STORAGE_KEY,
  Idea,
  createFeaturesFromText,
} from "./ideas";
import { AppendFeatureForm, AppendFeatureValues } from "./list-projects";

export default function AppendFeatureCommand() {
  const {
    value: storedProjects,
    setValue: setProjects,
    isLoading,
  } = useLocalStorage<Idea[]>(IDEAS_STORAGE_KEY, []);

  async function handleAppend(values: AppendFeatureValues): Promise<boolean> {
    const trimmed = values.feature?.trim();
    if (!trimmed) {
      await showToast(Toast.Style.Failure, "Feature text cannot be empty");
      return false;
    }

    const projects = storedProjects ?? [];
    const project = projects.find((item) => item.id === values.projectId);
    if (!project) {
      await showToast(Toast.Style.Failure, "Select an existing project");
      return false;
    }

    const now = new Date().toISOString();
    const [feature] = createFeaturesFromText(trimmed, { timestamp: now });
    if (!feature) {
      await showToast(Toast.Style.Failure, "Feature text cannot be empty");
      return false;
    }

    const updated = projects.map((item) => {
      if (item.id !== project.id) {
        return item;
      }

      return {
        ...item,
        features: [...item.features, feature],
        updatedAt: now,
      };
    });

    await setProjects(updated);
    await showToast(Toast.Style.Success, "Feature appended");
    return true;
  }

  if (isLoading) {
    return <Detail isLoading />;
  }

  if (!storedProjects || storedProjects.length === 0) {
    return (
      <Detail
        markdown="### No projects yet\nCreate a project first, then append features to it."
        actions={
          <ActionPanel>
            <Action
              title="Add Project"
              icon={Icon.Plus}
              onAction={() => launchCommand({ name: "add-project", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <AppendFeatureForm
      projects={storedProjects}
      onSubmit={handleAppend}
    />
  );
}
