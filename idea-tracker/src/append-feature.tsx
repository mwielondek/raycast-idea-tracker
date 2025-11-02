import { Action, ActionPanel, Detail, Form, Icon, LaunchType, Toast, launchCommand, showToast } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { IDEAS_STORAGE_KEY, Idea, createFeaturesFromText } from "./ideas";
import { AppendFeatureValues } from "./list-projects";

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

    if (project.isArchived) {
      await showToast(Toast.Style.Failure, "Project is archived");
      return false;
    }

    const now = new Date().toISOString();
    const features = createFeaturesFromText(trimmed, { timestamp: now });
    if (features.length === 0) {
      await showToast(Toast.Style.Failure, "Feature text cannot be empty");
      return false;
    }

    const updated = projects.map((item) => {
      if (item.id !== project.id) {
        return item;
      }

      return {
        ...item,
        features: [...item.features, ...features],
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

  const activeProjects = (storedProjects ?? []).filter((project) => !(project.isArchived ?? false));

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

  return <StandaloneAppendFeatureForm projects={activeProjects} onSubmit={handleAppend} />;
}

function StandaloneAppendFeatureForm(props: {
  projects: Idea[];
  onSubmit: (values: AppendFeatureValues) => Promise<boolean>;
}) {
  const { projects, onSubmit } = props;
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [featureText, setFeatureText] = useState<string>("");

  const projectPickerRef = useRef<Form.Dropdown>(null);
  const featureRef = useRef<Form.TextArea>(null);

  useEffect(() => {
    const timer = setTimeout(() => projectPickerRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, []);

  async function handleSubmit() {
    if (!selectedProjectId) {
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

    const success = await onSubmit({ projectId: selectedProjectId, feature: trimmedFeature });
    if (success) {
      setFeatureText("");
      setSelectedProjectId(undefined);
      setTimeout(() => projectPickerRef.current?.focus(), 0);
    }
  }

  const normalizedProjects = projects.map((project) => normalizeIdea(project));

  return (
    <Form
      navigationTitle="Append Feature"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Feature" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        ref={projectPickerRef}
        id="projectId"
        title="Project"
        value={selectedProjectId}
        autoFocus
        onChange={(value) => {
          setSelectedProjectId(value);
        }}
      >
        {normalizedProjects.map((project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={project.id}
            title={project.title}
            icon={project.isPinned ? Icon.Star : project.isArchived ? Icon.Folder : Icon.Circle}
          />
        ))}
      </Form.Dropdown>
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

function normalizeIdea(project: Idea): Idea {
  return {
    ...project,
    tags: project.tags ?? [],
    features: project.features ?? [],
    isPinned: project.isPinned ?? false,
    isArchived: project.isArchived ?? false,
  };
}
