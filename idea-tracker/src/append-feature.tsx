import { Action, ActionPanel, Detail, Icon, LaunchType, launchCommand, useNavigation } from "@raycast/api";
import { useCallback, useMemo } from "react";
import { AppendFeatureForm, EditFeaturesForm, EditProjectForm } from "./project-forms";
import { AppendFeatureValues } from "./project-form-types";
import { useIdeasManager } from "./use-ideas-manager";
import { formatIdeaMarkdown } from "./ideas";

export default function AppendFeatureCommand() {
  const { isLoading, projects, appendFeature } = useIdeasManager();
  const { push } = useNavigation();
  const activeProjects = useMemo(() => projects.filter((project) => !project.isArchived), [projects]);
  const handleAppend = useCallback(
    async (values: AppendFeatureValues): Promise<boolean> => {
      const result = await appendFeature(values.projectId, values.feature);
      if (!result) {
        return false;
      }

      push(<ProjectDetailView projectId={result.id} />);

      return true;
    },
    [appendFeature, push],
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

function ProjectDetailView({ projectId }: { projectId: string }) {
  const { projects, updateProject, editFeatures } = useIdeasManager();
  const project = useMemo(() => projects.find((item) => item.id === projectId), [projects, projectId]);

  if (!project) {
    return (
      <Detail
        navigationTitle="Project Unavailable"
        markdown="The project could not be found. It may have been removed."
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

  return (
    <Detail
      navigationTitle={project.title}
      markdown={formatIdeaMarkdown(project)}
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Project"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={
              <EditProjectForm
                project={project}
                onSubmit={async (values) => {
                  const updated = await updateProject(project.id, values);
                  return updated !== null;
                }}
              />
            }
          />
          <Action.Push
            title="Edit Features"
            icon={Icon.TextDocument}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            target={
              <EditFeaturesForm
                project={project}
                onSubmit={async (featureBodies) => {
                  const updated = await editFeatures(project.id, featureBodies);
                  return updated !== null;
                }}
              />
            }
          />
          <Action
            title="Open List Projects"
            icon={Icon.AppWindowList}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            onAction={() =>
              launchCommand({ name: "list-projects", type: LaunchType.UserInitiated, context: { projectId } })
            }
          />
        </ActionPanel>
      }
    />
  );
}
