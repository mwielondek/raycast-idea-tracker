import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const TAG_COLORS = ["#A5B4FC", "#C4B5FD", "#FDBA8C", "#FBCFE8", "#BFDBFE", "#FDE68A", "#F5D0FE", "#C7D2FE"] as const;

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
  const { value: storedProjects, setValue: setProjects, isLoading } = useLocalStorage<Idea[]>(IDEAS_STORAGE_KEY, []);

  const projects = useMemo(() => {
    return [...(storedProjects ?? []).map(normalizeProject)].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [storedProjects]);

  const { value: tagFilter, setValue: setTagFilter } = useLocalStorage<string>(
    "raycast-idea-tracker/tag-filter",
    "__all",
  );

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

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isDetailVisible, setDetailVisible] = useState(false);

  const handleShowProjectDetail = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    setDetailVisible(true);
  }, []);

  const handleHideProjectDetail = useCallback(() => {
    setDetailVisible(false);
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }

    const projectStillExists = projects.some((project) => project.id === selectedProjectId);
    if (!projectStillExists) {
      setSelectedProjectId(null);
      setDetailVisible(false);
    }
  }, [projects, selectedProjectId]);

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

  async function handleUpdateProject(projectId: string, values: ProjectFormValues): Promise<Idea | null> {
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
    return updatedProject ? normalizeProject(updatedProject) : null;
  }

  async function handleAppendFeature(projectId: string, featureText: string): Promise<Idea | null> {
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
    return updatedProject ? normalizeProject(updatedProject) : null;
  }

  async function handleEditFeatures(projectId: string, featuresText: string): Promise<Idea | null> {
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
    const updatedFeatures = createFeaturesFromText(featuresText, { timestamp: now });
    const updatedProjects = existing.map((item) => {
      if (item.id !== projectId) {
        return item;
      }
      return {
        ...item,
        features: updatedFeatures,
        updatedAt: now,
      };
    });

    await setProjects(updatedProjects);
    await showToast(Toast.Style.Success, "Features updated");
    const updatedProject = updatedProjects.find((item) => item.id === projectId);
    return updatedProject ? normalizeProject(updatedProject) : null;
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
        isArchived: pin ? false : (item.isArchived ?? false),
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
        isPinned: archive ? false : (item.isPinned ?? false),
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
      isShowingDetail={isDetailVisible}
      selectedItemId={selectedProjectId ?? undefined}
      searchBarPlaceholder="Search projects or features"
      onSelectionChange={(id) => {
        setSelectedProjectId(id ?? null);
        if (!id) {
          setDetailVisible(false);
        }
      }}
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
              <Action.Push
                title="Add Project"
                icon={Icon.Plus}
                target={<AddProjectForm onSubmit={handleCreateProject} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {filteredProjects.pinned.length > 0 && (
            <List.Section title="Pinned Projects" subtitle={`${filteredProjects.pinned.length}`}>
              {filteredProjects.pinned.map((project) => (
                <ProjectListItem
                  key={project.id}
                  project={project}
                  isDetailVisible={isDetailVisible}
                  selectedProjectId={selectedProjectId}
                  onShowDetail={handleShowProjectDetail}
                  onHideDetail={handleHideProjectDetail}
                  allProjects={projects}
                  onAppendFeature={handleAppendFeature}
                  onEditFeatures={handleEditFeatures}
                  onDelete={handleDeleteProject}
                  onCreateProject={handleCreateProject}
                  onUpdateProject={handleUpdateProject}
                  onTogglePin={handleTogglePin}
                  onToggleArchive={handleToggleArchive}
                />
              ))}
            </List.Section>
          )}

          <List.Section title="Projects" subtitle={`${filteredProjects.active.length}`}>
            {filteredProjects.active.length === 0 ? (
              <List.Item
                title="No active projects"
                icon={Icon.Tray}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Add Project"
                      icon={Icon.Plus}
                      target={<AddProjectForm onSubmit={handleCreateProject} />}
                    />
                  </ActionPanel>
                }
              />
            ) : (
              filteredProjects.active.map((project) => (
                <ProjectListItem
                  key={project.id}
                  project={project}
                  isDetailVisible={isDetailVisible}
                  selectedProjectId={selectedProjectId}
                  onShowDetail={handleShowProjectDetail}
                  onHideDetail={handleHideProjectDetail}
                  allProjects={projects}
                  onAppendFeature={handleAppendFeature}
                  onEditFeatures={handleEditFeatures}
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
            <List.Section title="Archived Projects" subtitle={`${filteredProjects.archived.length}`}>
              {filteredProjects.archived.map((project) => (
                <ProjectListItem
                  key={project.id}
                  project={project}
                  isDetailVisible={isDetailVisible}
                  selectedProjectId={selectedProjectId}
                  onShowDetail={handleShowProjectDetail}
                  onHideDetail={handleHideProjectDetail}
                  allProjects={projects}
                  onAppendFeature={handleAppendFeature}
                  onEditFeatures={handleEditFeatures}
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

type AppendFeatureHandler = (projectId: string, feature: string) => Promise<Idea | null>;

type UpdateProjectHandler = (projectId: string, values: ProjectFormValues) => Promise<Idea | null>;

type EditFeaturesHandler = (projectId: string, featuresText: string) => Promise<Idea | null>;

type ProjectListItemProps = {
  project: Idea;
  isDetailVisible: boolean;
  selectedProjectId: string | null;
  onShowDetail: (projectId: string) => void;
  onHideDetail: () => void;
  allProjects: Idea[];
  onAppendFeature: AppendFeatureHandler;
  onEditFeatures: EditFeaturesHandler;
  onDelete: (projectId: string) => Promise<void>;
  onCreateProject: (values: ProjectFormValues) => Promise<boolean>;
  onUpdateProject: UpdateProjectHandler;
  onTogglePin: (projectId: string, pin: boolean) => Promise<void>;
  onToggleArchive: (projectId: string, archive: boolean) => Promise<void>;
};

function ProjectListItem({
  project,
  isDetailVisible,
  selectedProjectId,
  onShowDetail,
  onHideDetail,
  allProjects,
  onAppendFeature,
  onEditFeatures,
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

  const isDetailActive = isDetailVisible && selectedProjectId === project.id;

  return (
    <List.Item
      id={project.id}
      title={project.title}
      subtitle={project.summary}
      keywords={[project.summary ?? "", ...project.tags]}
      accessories={accessories}
      icon={project.isPinned ? Icon.Star : project.isArchived ? Icon.Folder : Icon.Document}
      detail={isDetailVisible ? <ProjectListItemDetail project={project} /> : undefined}
      actions={
        <ProjectActions
          project={project}
          onShowDetail={onShowDetail}
          onHideDetail={onHideDetail}
          isDetailActive={isDetailActive}
          allProjects={allProjects}
          onAppendFeature={onAppendFeature}
          onEditFeatures={onEditFeatures}
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

function ProjectListItemDetail({ project }: { project: Idea }) {
  return <List.Item.Detail markdown={formatIdeaMarkdown(project)} />;
}

type ProjectActionsProps = {
  project: Idea;
  onShowDetail: (projectId: string) => void;
  onHideDetail: () => void;
  isDetailActive: boolean;
  allProjects: Idea[];
  onAppendFeature: AppendFeatureHandler;
  onEditFeatures: EditFeaturesHandler;
  onDelete: (projectId: string) => Promise<void>;
  onCreateProject: (values: ProjectFormValues) => Promise<boolean>;
  onUpdateProject: UpdateProjectHandler;
  onTogglePin: (projectId: string, pin: boolean) => Promise<void>;
  onToggleArchive: (projectId: string, archive: boolean) => Promise<void>;
};

function ProjectActions({
  project,
  onShowDetail,
  onHideDetail,
  isDetailActive,
  allProjects,
  onAppendFeature,
  onEditFeatures,
  onDelete,
  onCreateProject,
  onUpdateProject,
  onTogglePin,
  onToggleArchive,
}: ProjectActionsProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Project">
        {isDetailActive ? (
          <Action title="Hide Project Detail" icon={Icon.EyeDisabled} onAction={onHideDetail} />
        ) : (
          <Action title="Show Project Detail" icon={Icon.Eye} onAction={() => onShowDetail(project.id)} />
        )}
        <Action.Push
          title="Append Feature"
          icon={Icon.PlusCircle}
          target={
            <InlineAppendFeatureForm projectId={project.id} projectTitle={project.title} onSubmit={onAppendFeature} />
          }
        />
        <Action.Push
          title="Edit Features"
          icon={Icon.TextDocument}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          target={
            <EditFeaturesForm
              project={project}
              onSubmit={async (text) => {
                const result = await onEditFeatures(project.id, text);
                return result !== null;
              }}
            />
          }
        />
        <Action.Push
          title="Edit Project"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          target={
            <EditProjectForm
              project={project}
              onSubmit={async (values) => {
                const result = await onUpdateProject(project.id, values);
                return result !== null;
              }}
            />
          }
        />
        {project.isPinned ? (
          <Action
            title="Unpin Project"
            icon={Icon.Star}
            shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
            onAction={() => onTogglePin(project.id, false)}
          />
        ) : (
          <Action
            title="Pin Project"
            icon={Icon.Star}
            shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
            onAction={() => onTogglePin(project.id, true)}
          />
        )}
        {project.isArchived ? (
          <Action
            title="Restore Project"
            icon={Icon.Folder}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onAction={() => onToggleArchive(project.id, false)}
          />
        ) : (
          <Action
            title="Archive Project"
            icon={Icon.Folder}
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
  onSubmit: AppendFeatureHandler;
  onSuccess?: (project: Idea) => void;
}) {
  const { projectId, projectTitle, onSubmit, onSuccess } = props;
  return (
    <AppendFeatureForm
      navigationTitle={`Append Feature • ${projectTitle}`}
      projectId={projectId}
      closeOnSuccess
      onSubmit={async ({ feature }) => {
        const result = await onSubmit(projectId, feature);
        if (result) {
          onSuccess?.(result);
          return true;
        }
        return false;
      }}
    />
  );
}

function EditFeaturesForm({
  project,
  onSubmit,
}: {
  project: Idea;
  onSubmit: (featuresText: string) => Promise<boolean>;
}) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={`Edit Features • ${project.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Features"
            onSubmit={async (values: { features?: string }) => {
              const success = await onSubmit(values.features ?? "");
              if (success) {
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="features"
        title="Features"
        defaultValue={project.features.map((feature) => feature.content).join("\n")}
        placeholder="Each new line becomes its own bullet."
        autoFocus
      />
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
  const pickableProjects = (projects ?? []).map(normalizeProject);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? "");
  const [featureText, setFeatureText] = useState("");

  const projectPickerRef = useRef<Form.Dropdown>(null);
  const featureRef = useRef<Form.TextArea>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (projectId) {
        featureRef.current?.focus();
      } else {
        projectPickerRef.current?.focus();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [projectId]);

  async function handleSubmit() {
    const effectiveProjectId = projectId ?? selectedProjectId;
    if (!effectiveProjectId) {
      await showToast(Toast.Style.Failure, "Select a project");
      projectPickerRef.current?.focus();
      return;
    }

    const trimmedFeature = featureText.trim();
    if (!trimmedFeature) {
      await showToast(Toast.Style.Failure, "Describe the feature");
      featureRef.current?.focus();
      return;
    }

    const success = await onSubmit({ projectId: effectiveProjectId, feature: trimmedFeature });
    if (success) {
      setFeatureText("");
      if (!projectId) {
        setSelectedProjectId("");
        setTimeout(() => projectPickerRef.current?.focus(), 0);
      }
      if (closeOnSuccess) {
        pop();
      }
    }
  }

  return (
    <Form
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Feature" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {!projectId && pickableProjects.length > 0 && (
        <Form.Dropdown
          ref={projectPickerRef}
          id="projectId"
          title="Project"
          value={selectedProjectId}
          autoFocus
          onChange={(value) => setSelectedProjectId(value)}
        >
          {pickableProjects.map((project) => (
            <Form.Dropdown.Item
              key={project.id}
              value={project.id}
              title={project.title}
              icon={project.isPinned ? Icon.Star : project.isArchived ? Icon.Folder : Icon.Circle}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextArea
        ref={featureRef}
        id="feature"
        title="Feature Idea"
        placeholder="Describe the feature. Each new line becomes its own bullet."
        value={featureText}
        onChange={setFeatureText}
      />
    </Form>
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
          placeholder="Seed features here. Each new line becomes a separate bullet."
          defaultValue={initialValues.initialFeatures}
        />
      )}
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

function tagColor(tag: string): Color | string {
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
