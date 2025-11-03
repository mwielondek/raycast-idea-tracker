import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Form,
  Icon,
  LaunchProps,
  List,
  Toast,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Idea, formatAbsoluteDate, formatIdeaMarkdown, formatIdeasMarkdown } from "./ideas";
import { AddProjectForm, AppendFeatureForm, EditProjectForm } from "./project-forms";
import { ProjectFormValues } from "./project-form-types";
import { useIdeasManager } from "./use-ideas-manager";

const TAG_COLORS = ["#A5B4FC", "#C4B5FD", "#FDBA8C", "#FBCFE8", "#BFDBFE", "#FDE68A", "#F5D0FE", "#C7D2FE"] as const;

export default function ListProjectsCommand({ launchContext }: LaunchProps<{ projectId?: string }>) {
  const {
    isLoading,
    projects,
    createProject,
    updateProject,
    appendFeature,
    editFeatures,
    togglePin,
    toggleArchive,
    deleteProject,
    importProjectsFromMarkdown,
  } = useIdeasManager();

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

  const initialProjectId = launchContext?.projectId ?? null;
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId);
  const [isDetailVisible, setDetailVisible] = useState(Boolean(initialProjectId));

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

    if (isLoading) {
      return;
    }

    const projectStillExists = projects.some((project) => project.id === selectedProjectId);
    if (!projectStillExists) {
      setSelectedProjectId(null);
      setDetailVisible(false);
    }
  }, [projects, selectedProjectId, isLoading]);

  const handleCreateProject = useCallback(
    async (values: ProjectFormValues) => {
      const result = await createProject(values);
      return result !== null;
    },
    [createProject],
  );

  const handleUpdateProject = useCallback(
    async (projectId: string, values: ProjectFormValues) => updateProject(projectId, values),
    [updateProject],
  );

  const handleAppendFeature = useCallback(
    async (projectId: string, featureText: string) => appendFeature(projectId, featureText),
    [appendFeature],
  );

  const handleEditFeatures = useCallback(
    async (projectId: string, featureBodies: string[]) => editFeatures(projectId, featureBodies),
    [editFeatures],
  );

  const handleTogglePin = useCallback(
    async (projectId: string, pin: boolean) => togglePin(projectId, pin),
    [togglePin],
  );

  const handleToggleArchive = useCallback(
    async (projectId: string, archive: boolean) => toggleArchive(projectId, archive),
    [toggleArchive],
  );

  const handleDeleteProject = useCallback(async (projectId: string) => deleteProject(projectId), [deleteProject]);

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
              <Action.Push
                title="Import Projects from Markdown"
                icon={Icon.Upload}
                target={<ImportProjectsForm onImport={importProjectsFromMarkdown} />}
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
                  onImportProjects={importProjectsFromMarkdown}
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
                    <Action.Push
                      title="Import Projects from Markdown"
                      icon={Icon.Upload}
                      target={<ImportProjectsForm onImport={importProjectsFromMarkdown} />}
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
                  onImportProjects={importProjectsFromMarkdown}
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
                  onImportProjects={importProjectsFromMarkdown}
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

type EditFeaturesHandler = (projectId: string, featureBodies: string[]) => Promise<Idea | null>;

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
  onImportProjects: (filePath: string) => Promise<number>;
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
  onImportProjects,
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
          onImportProjects={onImportProjects}
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
  onImportProjects: (filePath: string) => Promise<number>;
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
  onImportProjects,
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
              onSubmit={async (featureBodies) => {
                const result = await onEditFeatures(project.id, featureBodies);
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
        <Action.Push
          title="Import Projects from Markdown"
          icon={Icon.Upload}
          shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          target={<ImportProjectsForm onImport={onImportProjects} />}
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

function ImportProjectsForm({ onImport }: { onImport: (filePath: string) => Promise<number> }) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="Import Projects"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import"
            onSubmit={async (values: { file?: string[] }) => {
              const filePath = values.file?.[0];
              if (!filePath) {
                await showToast(Toast.Style.Failure, "Choose a Markdown file");
                return;
              }
              const imported = await onImport(filePath);
              if (imported > 0) {
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="file" title="Markdown File" allowMultipleSelection={false} />
      <Form.Description text="Projects can be separated by blank lines. Start each project with a heading (or plain line) followed by features written as bullets using '-' or '*' characters." />
    </Form>
  );
}

function EditFeaturesForm({
  project,
  onSubmit,
}: {
  project: Idea;
  onSubmit: (featureBodies: string[]) => Promise<boolean>;
}) {
  const { pop } = useNavigation();
  const initialFeatureBodies = useMemo(
    () => (project.features.length > 0 ? project.features.map((feature) => feature.content) : [""]),
    [project.features],
  );
  const [featureInputs, setFeatureInputs] = useState<string[]>(initialFeatureBodies);

  useEffect(() => {
    setFeatureInputs(initialFeatureBodies);
  }, [initialFeatureBodies]);

  function handleFeatureChange(index: number, value: string) {
    setFeatureInputs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleAddField() {
    setFeatureInputs((prev) => [...prev, ""]);
  }

  function handleResetFields() {
    setFeatureInputs(initialFeatureBodies);
  }

  async function handleSubmit() {
    const success = await onSubmit(featureInputs);
    if (success) {
      pop();
    }
  }

  return (
    <Form
      navigationTitle={`Edit Features • ${project.title}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm title="Save Features" onSubmit={handleSubmit} />
            <Action
              title="Add Feature Field"
              icon={Icon.PlusCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
              onAction={handleAddField}
            />
            <Action
              title="Reset Changes"
              icon={Icon.ArrowCounterClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={handleResetFields}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description text="Update each feature individually. Leave a field blank to remove it when saving." />
      {featureInputs.map((value, index) => (
        <Form.TextArea
          key={`feature-${index}`}
          id={`feature-${index}`}
          title={`Feature ${index + 1}`}
          placeholder="Describe the feature."
          value={value}
          autoFocus={index === 0}
          info="Leave empty to remove this feature."
          onChange={(text) => handleFeatureChange(index, text)}
        />
      ))}
    </Form>
  );
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
