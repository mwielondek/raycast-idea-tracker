import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { Idea, normalizeIdea } from "./ideas";
import { AppendFeatureValues, ProjectFormValues } from "./project-form-types";

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
  const pickableProjects = useMemo(() => (projects ?? []).map(normalizeIdea), [projects]);
  const initialProjectSelection = projectId ?? "";

  const {
    handleSubmit: handleFormSubmit,
    itemProps,
    setValue,
    focus,
  } = useForm<AppendFeatureValues>({
    initialValues: {
      projectId: initialProjectSelection,
      feature: "",
    },
    onSubmit: async (formValues) => {
      const effectiveProjectId = projectId ?? formValues.projectId;
      if (!effectiveProjectId) {
        await showToast(Toast.Style.Failure, "Select a project");
        focus("projectId");
        return;
      }

      const trimmedFeature = formValues.feature.trim();
      if (!trimmedFeature) {
        await showToast(Toast.Style.Failure, "Describe the feature");
        focus("feature");
        return;
      }

      const success = await onSubmit({ projectId: effectiveProjectId, feature: trimmedFeature });
      if (!success) {
        return;
      }

      setValue("feature", "");
      if (!projectId) {
        setValue("projectId", "");
      }
      focus("feature");
      if (closeOnSuccess) {
        pop();
      }
    },
  });

  useEffect(() => {
    if (projectId) {
      setValue("projectId", projectId);
      focus("feature");
    }
  }, [projectId, setValue, focus]);

  useEffect(() => {
    if (!projectId) {
      focus("projectId");
    }
  }, [projectId, focus]);

  return (
    <Form
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Feature" onSubmit={handleFormSubmit} />
        </ActionPanel>
      }
    >
      {!projectId && pickableProjects.length > 0 && (
        <Form.Dropdown
          {...itemProps.projectId}
          title="Project"
          autoFocus
          onChange={(value) => {
            itemProps.projectId?.onChange?.(value);
          }}
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
        {...itemProps.feature}
        title="Feature Idea"
        placeholder="Describe the feature. Each new line becomes its own bullet."
        autoFocus={Boolean(projectId)}
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

export function EditProjectForm({
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

export function EditFeaturesForm({
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
