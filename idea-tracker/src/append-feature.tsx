import { Action, ActionPanel, Detail, Icon, LaunchType, launchCommand } from "@raycast/api";
import { useCallback, useMemo } from "react";
import { AppendFeatureForm } from "./project-forms";
import { AppendFeatureValues } from "./project-form-types";
import { useIdeasManager } from "./use-ideas-manager";

export default function AppendFeatureCommand() {
  const { isLoading, projects, appendFeature } = useIdeasManager();
  const activeProjects = useMemo(() => projects.filter((project) => !project.isArchived), [projects]);
  const handleAppend = useCallback(
    async (values: AppendFeatureValues): Promise<boolean> => {
      const result = await appendFeature(values.projectId, values.feature);
      return result !== null;
    },
    [appendFeature],
  );

  if (isLoading) {
    return <Detail isLoading />;
  }

  if (projects.length === 0) {
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

  if (activeProjects.length === 0) {
    return (
      <Detail
        markdown="### All projects archived\nRestore a project before appending new features to it."
        actions={
          <ActionPanel>
            <Action
              title="Open List Projects"
              icon={Icon.AppWindowList}
              onAction={() => launchCommand({ name: "list-projects", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
    );
  }

  return <AppendFeatureForm projects={activeProjects} onSubmit={handleAppend} />;
}
