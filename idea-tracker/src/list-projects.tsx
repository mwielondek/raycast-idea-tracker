import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  launchCommand,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useLocalStorage, useForm } from "@raycast/utils";
import { useMemo } from "react";
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

const TAG_COLORS = [Color.Blue, Color.Red, Color.Green, Color.Orange, Color.Purple, Color.Magenta, Color.Yellow, Color.PrimaryText];

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

type StoredProject = Omit<Idea, "tags" | "features" | "isPinned" | "isArchived"> & {
  tags?: string[];
  features?: Idea["features"];
  isPinned?: boolean;
  isArchived?: boolean;
};

export default function ListProjectsCommand() {
  const {
    value: storedProjects,
    setValue: setProjects,
    isLoading,
  } = useLocalStorage<Idea[]>(IDEAS_STORAGE_KEY, []);

  const projects = useMemo(() => {
    return [...(storedProjects ?? []).map(normalizeProject)].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [storedProjects]);

  const {
    value: tagFilter,
    setValue: setTagFilter,
  } = useLocalStorage<string>("raycast-idea-tracker/tag-filter", "__all");

  const selectedTag = tagFilter ?? "__all";

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const project of projects) {
      project.tags.forEach((tag) => tagSet.add(tag));
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const list = selectedTag === "__all" ? projects : projects.filter((project) => project.tags.includes(selectedTag));
    return {
      pinned: list.filter((project) => project.isPinned && !project.isArchived),
      active: list.filter((project) => !project.isPinned && !project.isArchived),
      archived: list.filter((project) => project.isArchived),
    };
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

  async function handleUpdateProject(projectId: string, values: ProjectFormValues): Promise<boolean> {
    const title = values.title?.trim();
    if (!title) {
      await showToast(Toast.Style.Failure, "Project name is required");
      return false;
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
    return true;
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

    if (project.isArchived) {
      await showToast(Toast.Style.Failure, "Project is archived");
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

  async function handleTogglePin(projectId: string, pin: boolean) {
    const now = new Date().toISOString();
    const updated = (storedProjects ?? []).map((item) => {
      if (item.id !== projectId) {
        return item;
      }
      return {
        ...item,
        isPinned: pin,
        isArchived: pin ? false : item.isArchived ?? false,
        updatedAt: now,
      };
    });

    await setProjects(updated);
    await showToast(Toast.Style.Success, pin ? "Project pinned" : "Project unpinned");
  }

  async function handleToggleArchive(projectId: string, archive: boolean) {
    const now = new Date().toISOString();
    const updated = (storedProjects ?? []).map((item) => {
      if (item.id !== projectId) {
        return item;
      }
      return {
        ...item,
        isArchived: archive,
        isPinned: archive ? false : item.isPinned ?? false,
        updatedAt: now,
      };
    });

    await setProjects(updated);
    await showToast(Toast.Style.Success, archive ? "Project archived" : "Project restored");
  }

  async function handleDeleteProject(projectId: string) {
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
  }

  return (
    <List
      isLoading={isLoading}
      throttle
      searchBarPlaceholder="Search projects or features"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by tag"
          storeValue
          value={selectedTag}
          onChange={(value) => void setTagFilter(value)}
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
      {filteredProjects.pinned.length === 0 &&
      filteredProjects.active.length === 0 &&
      filteredProjects.archived.length === 0 ? (
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
        <>
          {filteredProjects.pinned.length > 0 && (
            <List.Section title="Pinned Projects">
              {filteredProjects.pinned.map((project) => (
                <ProjectListItem
                  key={project.id}
                  project={project}
                  allProjects={projects}
                  onAppendFeature={handleAppendFeature}
                  onDelete={handleDeleteProject}
                  onCreateProject={handleCreateProject}
                  onUpdateProject={handleUpdateProject}
                  onTogglePin={handleTogglePin}
                  onToggleArchive={handleToggleArchive}
                />
              ))}
            </List.Section>
          )}

          <List.Section title="Projects">
            {filteredProjects.active.length === 0 ? (
              <List.Item
                title="No active projects"
                icon={Icon.Tray}
                accessories={
                  selectedTag === "__all" ? undefined : [{ tag: { value: selectedTag, color: tagColor(selectedTag) } }]
                }
              />
            ) : (
              filteredProjects.active.map((project) => (
                <ProjectListItem
                  key={project.id}
                  project={project}
                  allProjects={projects}
                  onAppendFeature={handleAppendFeature}
                  onDelete={handleDeleteProject}
                  onCreateProject={handleCreateProject}
                  onUpdateProject={handleUpdateProject}
                  onTogglePin={handleTogglePin}
                  onToggleArchive={handleToggleArchive}
                />
              ))
            )}
          </List.Section>

          {filteredProjects.archived.length > 0 && (
            <List.Section title="Archived Projects">
              {filteredProjects.archived.map((project) => (
                <ProjectListItem
                  key={project.id}
                  project={project}
                  allProjects={projects}
                  onAppendFeature={handleAppendFeature}
                  onDelete={handleDeleteProject}
                  onCreateProject={handleCreateProject}
                  onUpdateProject={handleUpdateProject}
                  onTogglePin={handleTogglePin}
                  onToggleArchive={handleToggleArchive}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

type ProjectListItemProps = {
  project: Idea;
  allProjects: Idea[];
  onAppendFeature: (projectId: string, feature: string) => Promise<boolean>;
  onDelete: (projectId: string) => Promise<void>;
  onCreateProject: (values: ProjectFormValues) => Promise<boolean>;
  onUpdateProject: (projectId: string, values: ProjectFormValues) => Promise<boolean>;
  onTogglePin: (projectId: string, pin: boolean) => Promise<void>;
  onToggleArchive: (projectId: string, archive: boolean) => Promise<void>;
};

function ProjectListItem({
  project,
  allProjects,
  onAppendFeature,
  onDelete,
  onCreateProject,
  onUpdateProject,
  onTogglePin,
  onToggleArchive,
}: ProjectListItemProps) {
  const accessories: List.Item.Accessory[] = project.tags.map((tag) => ({
    tag: { value: tag, color: tagColor(tag) },
  }));

  accessories.push({
    text: formatRelativeTime(project.updatedAt),
    tooltip: `Updated ${formatAbsoluteDate(project.updatedAt)}`,
  });

  return (
    <List.Item
      title={project.title}
      subtitle={project.summary}
      keywords={[project.summary ?? "", ...project.tags]}
      accessories={accessories}
      actions={
        <ProjectActions
          project={project}
          allProjects={allProjects}
          onAppendFeature={onAppendFeature}
          onDelete={onDelete}
          onCreateProject={onCreateProject}
          onUpdateProject={onUpdateProject}
          onTogglePin={onTogglePin}
          onToggleArchive={onToggleArchive}
        />
      }
    />
  );
}

type ProjectActionsProps = {
  project: Idea;
  allProjects: Idea[];
  onAppendFeature: (projectId: string, feature: string) => Promise<boolean>;
  onDelete: (projectId: string) => Promise<void>;
  onCreateProject: (values: ProjectFormValues) => Promise<boolean>;
  onUpdateProject: (projectId: string, values: ProjectFormValues) => Promise<boolean>;
  onTogglePin: (projectId: string, pin: boolean) => Promise<void>;
  onToggleArchive: (projectId: string, archive: boolean) => Promise<void>;
};

function ProjectActions({
  project,
  allProjects,
  onAppendFeature,
  onDelete,
  onCreateProject,
  onUpdateProject,
  onTogglePin,
  onToggleArchive,
}: ProjectActionsProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Project">
        <Action.Push
          title="Open Project"
          icon={Icon.TextDocument}
          target={<ProjectDetail project={project} />}
        />
        <Action.Push
          title="Append Feature"
          icon={Icon.PlusCircle}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          target={
            <InlineAppendFeatureForm
              projectId={project.id}
              projectTitle={project.title}
              onSubmit={onAppendFeature}
            />
          }
        />
        <Action.Push
          title="Edit Project"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          target={<EditProjectForm project={project} onSubmit={(values) => onUpdateProject(project.id, values)} />}
        />
        {project.isPinned ? (
          <Action
            title="Unpin Project"
            icon={Icon.Pin}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            onAction={() => onTogglePin(project.id, false)}
          />
        ) : (
          <Action
            title="Pin Project"
            icon={Icon.Pin}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            onAction={() => onTogglePin(project.id, true)}
          />
        )}
        {project.isArchived ? (
          <Action
            title="Restore Project"
            icon={Icon.RotateAntiClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onAction={() => onToggleArchive(project.id, false)}
          />
        ) : (
          <Action
            title="Archive Project"
            icon={Icon.Tray}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onAction={() => onToggleArchive(project.id, true)}
          />
        )}
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
            await Clipboard.copy(formatIdeasMarkdown(allProjects));
            await showHUD("Copied all projects");
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
          onAction={async () => onDelete(project.id)}
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

  return (
    <AppendFeatureForm
      navigationTitle={`Append Feature • ${projectTitle}`}
      projectId={projectId}
      closeOnSuccess
      onSubmit={(values) => onSubmit(values.projectId, values.feature)}
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
  return (
    <ProjectForm
      navigationTitle="Add Project"
      submitLabel="Create Project"
      initialValues={{ title: "", summary: "", tags: "", initialFeatures: "" }}
      onSubmit={onSubmit}
    />
  );
}

function EditProjectForm({
  project,
  onSubmit,
}: {
  project: Idea;
  onSubmit: (values: ProjectFormValues) => Promise<boolean>;
}) {
  return (
    <ProjectForm
      navigationTitle={`Edit Project • ${project.title}`}
      submitLabel="Save Changes"
      initialValues={{
        title: project.title,
        summary: project.summary ?? "",
        tags: project.tags.join(", "),
      }}
      includeInitialFeatures={false}
      onSubmit={onSubmit}
    />
  );
}

function ProjectForm({
  navigationTitle,
  submitLabel,
  initialValues,
  onSubmit,
  includeInitialFeatures = true,
}: {
  navigationTitle: string;
  submitLabel: string;
  initialValues: Partial<ProjectFormValues>;
  onSubmit: (values: ProjectFormValues) => Promise<boolean>;
  includeInitialFeatures?: boolean;
}) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={submitLabel}
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
      <Form.TextField id="title" title="Project Name" defaultValue={initialValues.title} autoFocus />
      <Form.TextArea
        id="summary"
        title="Context"
        placeholder="Problem statement, value proposition, or notes"
        defaultValue={initialValues.summary}
      />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="growth, productivity"
        info="Comma-separated tags"
        defaultValue={initialValues.tags}
      />
      {includeInitialFeatures && (
        <Form.TextArea
          id="initialFeatures"
          title="Initial Features"
          placeholder="Each line becomes a feature bullet"
          defaultValue={initialValues.initialFeatures}
        />
      )}
    </Form>
  );
}

type AppendFeatureFormProps = {
  navigationTitle?: string;
  projectId?: string;
  projects?: Idea[];
  onSubmit: (values: AppendFeatureValues) => Promise<boolean>;
  closeOnSuccess?: boolean;
};

export function AppendFeatureForm({
  navigationTitle = "Append Feature",
  projectId,
  projects,
  onSubmit,
  closeOnSuccess = false,
}: AppendFeatureFormProps) {
  const { pop } = useNavigation();
  const availableProjects = (projects ?? []).map(normalizeProject);
  const initialProjectId = projectId ?? availableProjects[0]?.id ?? "";

  const form = useForm<AppendFeatureValues>({
    initialValues: {
      projectId: initialProjectId,
      feature: "",
    },
    onSubmit: async (values) => {
      const targetProjectId = projectId ?? values.projectId;
      if (!targetProjectId) {
        await showToast(Toast.Style.Failure, "Select a project");
        return false;
      }
      const success = await onSubmit({ projectId: targetProjectId, feature: values.feature });
      if (success && closeOnSuccess) {
        pop();
      }
      return success;
    },
  });

  return (
    <Form
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Feature"
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            onSubmit={form.handleSubmit}
          />
          {!projectId && availableProjects.length > 0 && (
            <Action
              title="Focus Project Picker"
              icon={Icon.CommandSymbol}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
              onAction={() => form.focus("projectId")}
            />
          )}
        </ActionPanel>
      }
    >
      {!projectId && availableProjects.length > 0 && (
        <Form.Dropdown title="Project" {...form.itemProps.projectId} storeValue>
          {availableProjects.map((project) => (
            <Form.Dropdown.Item
              key={project.id}
              value={project.id}
              title={project.title}
              icon={project.isPinned ? Icon.Pin : project.isArchived ? Icon.Tray : Icon.Circle}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextArea
        title="Feature Idea"
        placeholder="Outline the feature or enhancement to append"
        {...form.itemProps.feature}
        autoFocus
      />
    </Form>
  );
}

function normalizeProject(project: StoredProject): Idea {
  return {
    ...project,
    tags: project.tags ?? [],
    features: project.features ?? [],
    isPinned: project.isPinned ?? false,
    isArchived: project.isArchived ?? false,
  };
}

function tagColor(tag: string): Color {
  const index = Math.abs(hashCode(tag)) % TAG_COLORS.length;
  return TAG_COLORS[index];
}

function hashCode(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }
  return hash;
}

function formatRelativeTime(dateISO: string): string {
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const now = Date.now();
  const date = new Date(dateISO).getTime();
  const diff = date - now;
  const divisions: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.34524, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];

  let duration = diff / 1000;
  for (const [amount, unit] of divisions) {
    if (Math.abs(duration) < amount) {
      return formatter.format(Math.round(duration), unit);
    }
    duration /= amount;
  }
  return formatter.format(Math.round(duration), "year");
}
