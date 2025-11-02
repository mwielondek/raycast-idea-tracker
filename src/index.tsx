import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useMemo } from "react";
import { randomUUID } from "node:crypto";
import {
  Idea,
  IdeaFeature,
  createFeaturesFromText,
  formatAbsoluteDate,
  formatIdeaMarkdown,
  formatIdeasMarkdown,
} from "./ideas";

const STORAGE_KEY = "raycast-idea-tracker/ideas";

type IdeaFormValues = {
  title: string;
  summary?: string;
  initialFeatures?: string;
};

type AppendFeatureValues = {
  feature: string;
};

export default function Command() {
  const {
    value: storedIdeas,
    setValue: setIdeas,
    isLoading,
  } = useLocalStorage<Idea[]>(STORAGE_KEY, []);

  const ideas = useMemo(() => {
    return [...(storedIdeas ?? [])].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [storedIdeas]);

  async function handleCreateIdea(values: IdeaFormValues): Promise<boolean> {
    const title = values.title?.trim();
    if (!title) {
      await showToast(Toast.Style.Failure, "Title is required");
      return false;
    }

    const now = new Date().toISOString();
    const features = createFeaturesFromText(values.initialFeatures);
    const nextIdea: Idea = {
      id: randomUUID(),
      title,
      summary: values.summary?.trim() || undefined,
      features,
      createdAt: now,
      updatedAt: now,
    };

    return setIdeas([nextIdea, ...(storedIdeas ?? [])])
      .then(async () => {
        await showToast(Toast.Style.Success, "Idea added", title);
        return true;
      })
      .catch(async (error) => {
        await showToast(Toast.Style.Failure, "Failed to add idea", String(error));
        return false;
      });
  }

  async function handleAppendFeature(ideaId: string, featureText: string): Promise<boolean> {
    const trimmed = featureText.trim();
    if (!trimmed) {
      await showToast(Toast.Style.Failure, "Feature text cannot be empty");
      return false;
    }

    const existing = storedIdeas ?? [];
    if (!existing.some((idea) => idea.id === ideaId)) {
      await showToast(Toast.Style.Failure, "Idea not found");
      return false;
    }

    const now = new Date().toISOString();
    const updated = existing.map((idea) => {
      if (idea.id !== ideaId) {
        return idea;
      }
      const nextFeature: IdeaFeature = { id: randomUUID(), content: trimmed, createdAt: now };
      return {
        ...idea,
        features: [...idea.features, nextFeature],
        updatedAt: now,
      };
    });

    await setIdeas(updated);
    await showToast(Toast.Style.Success, "Feature added");
    return true;
  }

  async function handleDeleteIdea(ideaId: string) {
    const next = (storedIdeas ?? []).filter((idea) => idea.id !== ideaId);
    await setIdeas(next);
    await showToast(Toast.Style.Success, "Idea deleted");
  }

  const listActions = (
    <ActionPanel>
      <Action.Push
        title="Add Idea"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        target={<AddIdeaForm onSave={handleCreateIdea} />}
      />
      {ideas.length > 0 && (
        <Action
          title="Copy All Ideas as Markdown"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
          onAction={async () => {
            await Clipboard.copy(formatIdeasMarkdown(ideas));
            await showHUD("Copied all ideas");
          }}
        />
      )}
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search ideas" actions={listActions} throttle>
      {ideas.length === 0 ? (
        <List.EmptyView
          icon={Icon.Plus}
          title="Capture your first idea"
          description="Add an idea to start building your feature backlog."
          actions={listActions}
        />
      ) : (
        ideas.map((idea) => (
          <List.Item
            key={idea.id}
            title={idea.title}
            subtitle={idea.summary}
            accessories={[
              { tag: `${idea.features.length} ${idea.features.length === 1 ? "feature" : "features"}` },
              { date: new Date(idea.updatedAt), tooltip: `Updated ${formatAbsoluteDate(idea.updatedAt)}` },
            ]}
            actions={
              <IdeaActions
                idea={idea}
                onAppendFeature={handleAppendFeature}
                onDelete={handleDeleteIdea}
                onCreateIdea={handleCreateIdea}
              />
            }
          />
        ))
      )}
    </List>
  );
}

function IdeaActions(props: {
  idea: Idea;
  onAppendFeature: (ideaId: string, feature: string) => Promise<boolean>;
  onDelete: (ideaId: string) => Promise<void>;
  onCreateIdea: (values: IdeaFormValues) => Promise<boolean>;
}) {
  const { idea, onAppendFeature, onDelete, onCreateIdea } = props;

  return (
    <ActionPanel>
      <ActionPanel.Section title="Idea">
        <Action.Push
          icon={Icon.Pencil}
          title="Append Feature"
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          target={<AppendFeatureForm ideaTitle={idea.title} onSave={(feature) => onAppendFeature(idea.id, feature)} />}
        />
        <Action.Push
          icon={Icon.AppWindowSidebarRight}
          title="View Idea"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          target={<IdeaDetail idea={idea} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Export">
        <Action
          title="Copy Idea as Markdown"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          onAction={async () => {
            await Clipboard.copy(formatIdeaMarkdown(idea));
            await showHUD("Copied idea");
          }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Manage">
        <Action.Push
          title="Add New Idea"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<AddIdeaForm onSave={onCreateIdea} />}
        />
        <Action
          title="Delete Idea"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => onDelete(idea.id)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function AddIdeaForm(props: { onSave: (values: IdeaFormValues) => Promise<boolean> }) {
  const { onSave } = props;
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="New Idea"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Idea"
            onSubmit={async (values: IdeaFormValues) => {
              const success = await onSave(values);
              if (success) {
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Idea Title" placeholder="AI-powered nutrition coach" autoFocus />
      <Form.TextArea id="summary" title="Context" placeholder="Problem, target audience, or success criteria" />
      <Form.TextArea
        id="initialFeatures"
        title="Initial Features"
        placeholder="Each line becomes a feature bullet"
      />
    </Form>
  );
}

function AppendFeatureForm(props: { ideaTitle: string; onSave: (feature: string) => Promise<boolean> }) {
  const { ideaTitle, onSave } = props;
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={`Append Feature \u2022 ${ideaTitle}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Feature"
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            onSubmit={async (values: AppendFeatureValues) => {
              const success = await onSave(values.feature);
              if (success) {
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="feature"
        title="Feature Idea"
        placeholder="E.g. Viral waitlist with referral rewards"
        autoFocus
      />
    </Form>
  );
}

function IdeaDetail(props: { idea: Idea }) {
  const { idea } = props;
  return (
    <Detail
      navigationTitle={idea.title}
      markdown={formatIdeaMarkdown(idea)}
      actions={
        <ActionPanel>
          <Action
            title="Copy Idea as Markdown"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(formatIdeaMarkdown(idea));
              await showHUD("Copied idea");
            }}
          />
        </ActionPanel>
      }
    />
  );
}
