import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  launchCommand,
  LaunchType,
  List,
  Toast,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useMemo, useState } from "react";
import {
  IDEAS_STORAGE_KEY,
  Idea,
  createFeaturesFromText,
  createIdea,
  formatAbsoluteDate,
  formatIdeaMarkdown,
  formatIdeasMarkdown,
  parseTagsInput,
} from "./ideas";

export type ProjectFormValues = {
  title: string;
  summary?: string;
  tags?: string;
  initialFeatures?: string;
};

export type AppendFeatureValues = {
  projectId: string;
  feature: string;
};

export default function ListProjectsCommand() {
  const {
    value: storedProjects,
    setValue: setProjects,
    isLoading,
  } = useLocalStorage<Idea[]>(IDEAS_STORAGE_KEY, []);

  const [selectedTag, setSelectedTag] = useState<string>("__all");

  const projects = useMemo(() => {
    return [...(storedProjects ?? [])].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [storedProjects]);

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const project of projects) {
      project.tags.forEach((tag) => tagSet.add(tag));
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (selectedTag === "__all") {
      return projects;
    }
    return projects.filter((project) => project.tags.includes(selectedTag));
  }, [projects, selectedTag]);

  async function handleCreateProject(values: ProjectFormValues): Promise<boolean> {
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

  async function handleAppendFeature(projectId: string, featureText: string): Promise<boolean> {
    const trimmed = featureText.trim();
    if (!trimmed) {
      await showToast(Toast.Style.Failure, "Feature text cannot be empty");
      return false;
    }

    const existing = storedProjects ?? [];
    const project = existing.find((item) => item.id === projectId);
    if (!project) {
      await showToast(Toast.Style.Failure, "Project not found");
      return false;
    }

    const now = new Date().toISOString();
    const [nextFeature] = createFeaturesFromText(trimmed, { timestamp: now });
    if (!nextFeature) {
      return false;
    }

    const updatedProjects = existing.map((item) => {
      if (item.id !== projectId) {
        return item;
      }

      return {
        ...item,
        features: [...item.features, nextFeature],
        updatedAt: now,
      };
    });

    await setProjects(updatedProjects);
    await showToast(Toast.Style.Success, "Feature appended");
    return true;
  }

  async function handleDeleteProject(projectId: string) {
    const next = (storedProjects ?? []).filter((item) => item.id !== projectId);
    await setProjects(next);
    await showToast(Toast.Style.Success, "Project deleted");
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      throttle
      searchBarPlaceholder="Search projects or features"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by tag"
          storeValue
          onChange={setSelectedTag}
          value={selectedTag}
        >
          <List.Dropdown.Item value="__all" title="All tags" />
          <List.Dropdown.Section title="Tags">
            {availableTags.map((tag) => (
              <List.Dropdown.Item key={tag} value={tag} title={tag} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredProjects.length === 0 ? (
        <List.EmptyView
          icon={Icon.Plus}
          title="Start tracking your first project"
          description="Create a project to begin capturing ideas and features."
          actions={
            <ActionPanel>
              <Action.Push title="Add Project" icon={Icon.Plus} target={<AddProjectForm onSubmit={handleCreateProject} />} />
            </ActionPanel>
          }
        />
      ) : (
        filteredProjects.map((project) => {
          const accessories: List.Item.Accessory[] = [
            { tag: { value: `${project.features.length} feature${project.features.length === 1 ? "" : "s"}` } },
            {
              date: new Date(project.updatedAt),
              tooltip: `Updated ${formatAbsoluteDate(project.updatedAt)}`,
            },
          ];

          if (project.tags.length > 0) {
            accessories.unshift({
              tag: { value: project.tags.join(", "), color: Color.Blue },
            });
          }

          return (
            <List.Item
              key={project.id}
              title={project.title}
              subtitle={project.summary}
              keywords={[project.summary ?? "", ...project.tags]}
              accessories={accessories}
              detail={
                <List.Item.Detail
                  markdown={formatIdeaMarkdown(project)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Updated" text={formatAbsoluteDate(project.updatedAt)} />
                      <List.Item.Detail.Metadata.Label title="Created" text={formatAbsoluteDate(project.createdAt)} />
                      {project.tags.length > 0 && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Tags" text={project.tags.join(", ")} />
                        </>
                      )}
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Feature Count" text={String(project.features.length)} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ProjectActions
                  project={project}
                  onAppendFeature={handleAppendFeature}
                  onDelete={handleDeleteProject}
                  onCreateProject={handleCreateProject}
                  onCopyAll={async () => {
                    await Clipboard.copy(formatIdeasMarkdown(projects));
                    await showHUD("Copied all projects");
                  }}
                />
              }
            />
          );
        })
      )}
    </List>
  );
}

type ProjectActionsProps = {
  project: Idea;
  onAppendFeature: (projectId: string, feature: string) => Promise<boolean>;
  onDelete: (projectId: string) => Promise<void>;
  onCreateProject: (values: ProjectFormValues) => Promise<boolean>;
  onCopyAll: () => Promise<void>;
};

function ProjectActions({ project, onAppendFeature, onDelete, onCreateProject, onCopyAll }: ProjectActionsProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Project">
        <Action.Push
          title="Append Feature"
          icon={Icon.PlusCircle}
          shortcut={{ modifiers: [], key: "return" }}
          target={
            <InlineAppendFeatureForm
              projectId={project.id}
              projectTitle={project.title}
              onSubmit={onAppendFeature}
            />
          }
        />
        <Action.Push
          title="Expand Project Detail"
          icon={Icon.AppWindowSidebarRight}
          shortcut={{ modifiers: ["cmd"], key: "enter" }}
          target={<ProjectDetail project={project} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Export">
        <Action
          title="Copy Project as Markdown"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
          onAction={async () => {
            await Clipboard.copy(formatIdeaMarkdown(project));
            await showHUD("Copied project");
          }}
        />
        <Action
          title="Copy All Projects as Markdown"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          onAction={async () => {
            await onCopyAll();
          }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Navigate">
        <Action.Push
          title="Add Project"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<AddProjectForm onSubmit={onCreateProject} />}
        />
        <Action
          title="Open Add Project Command"
          icon={Icon.AppWindowList}
          onAction={() => launchCommand({ name: "add-project", type: LaunchType.UserInitiated })}
        />
        <Action
          title="Open Append Feature Command"
          icon={Icon.Bolt}
          onAction={() => launchCommand({ name: "append-feature", type: LaunchType.UserInitiated })}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Manage">
        <Action
          title="Delete Project"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={() => onDelete(project.id)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function InlineAppendFeatureForm(props: {
  projectId: string;
  projectTitle: string;
  onSubmit: (projectId: string, feature: string) => Promise<boolean>;
}) {
  const { projectId, projectTitle, onSubmit } = props;
  const { pop } = useNavigation();

  return (
    <AppendFeatureForm
      defaultValues={{ projectId, feature: "" }}
      projectId={projectId}
      projects={undefined}
      navigationTitle={`Append Feature • ${projectTitle}`}
      onSubmit={async (values) => {
        const success = await onSubmit(values.projectId, values.feature);
        if (success) {
          pop();
        }
        return success;
      }}
    />
  );
}

function ProjectDetail({ project }: { project: Idea }) {
  return (
    <Detail
      navigationTitle={project.title}
      markdown={formatIdeaMarkdown(project)}
      actions={
        <ActionPanel>
          <Action
            title="Copy Project as Markdown"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(formatIdeaMarkdown(project));
              await showHUD("Copied project");
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export function AddProjectForm({ onSubmit }: { onSubmit: (values: ProjectFormValues) => Promise<boolean> }) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="Add Project"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Project"
            onSubmit={async (values: ProjectFormValues) => {
              const success = await onSubmit(values);
              if (success) {
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Project Name" placeholder="AI nutrition coach" autoFocus />
      <Form.TextArea
        id="summary"
        title="Context"
        placeholder="Problem statement, value proposition, or notes"
      />
      <Form.TextField id="tags" title="Tags" placeholder="growth, productivity" info="Comma-separated tags" />
      <Form.TextArea
        id="initialFeatures"
        title="Initial Features"
        placeholder="Each line becomes a feature bullet"
      />
    </Form>
  );
}

type AppendFeatureFormProps = {
  navigationTitle?: string;
  projectId?: string;
  projects?: Idea[];
  defaultValues?: Partial<AppendFeatureValues>;
  onSubmit: (values: AppendFeatureValues) => Promise<boolean>;
};

export function AppendFeatureForm({
  navigationTitle = "Append Feature",
  projectId,
  projects,
  defaultValues,
  onSubmit,
}: AppendFeatureFormProps) {
  const { pop } = useNavigation();
  const [selectedProject, setSelectedProject] = useState<string | undefined>(defaultValues?.projectId ?? projectId);

  return (
    <Form
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Feature"
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            onSubmit={async (values: AppendFeatureValues) => {
              const targetProjectId = projectId ?? values.projectId ?? selectedProject;
              if (!targetProjectId) {
                await showToast(Toast.Style.Failure, "Select a project");
                return;
              }
              const success = await onSubmit({ projectId: targetProjectId, feature: values.feature });
              if (success) {
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      {!projectId && projects && (
        <Form.Dropdown
          id="projectId"
          title="Project"
          storeValue
          value={selectedProject}
          onChange={setSelectedProject}
        >
          {projects.map((project) => (
            <Form.Dropdown.Item key={project.id} value={project.id} title={project.title} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextArea
        id="feature"
        title="Feature Idea"
        placeholder="Outline the feature or enhancement to append"
        defaultValue={defaultValues?.feature}
        autoFocus
      />
    </Form>
  );
}
