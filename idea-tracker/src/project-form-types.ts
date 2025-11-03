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
