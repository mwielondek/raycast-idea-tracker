import { Detail } from "@raycast/api";
import { AddProjectForm } from "./project-forms";
import { ProjectFormValues } from "./project-form-types";
import { useIdeasManager } from "./use-ideas-manager";

export default function AddProjectCommand() {
  const { isLoading, createProject } = useIdeasManager();

  if (isLoading) {
    return <Detail isLoading />;
  }

  return (
    <AddProjectForm
      onSubmit={async (values: ProjectFormValues) => {
        const created = await createProject(values);
        return created !== null;
      }}
    />
  );
}
