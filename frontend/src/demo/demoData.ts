import type { Task } from "@common/types/tasks";
import type { AnnotationItem } from "@common/types/annotations";

export const demoTask: Task = {
  _id: "demo-task-1",
  name: "Pangolin Conservation Sentiment",
  description: "Classify social media posts about pangolin conservation as positive, negative, or neutral toward conservation efforts.",
  type: "Multiclass",
  labels: [
    { name: "positive", definition: "Supports or promotes pangolin conservation", keywords: ["protect", "save", "endangered", "conservation"] },
    { name: "negative", definition: "Promotes illegal trade or consumption of pangolins", keywords: ["traffic", "trade", "leather", "consumption"] },
    { name: "neutral", definition: "Neutral stance or factual information about pangolins", keywords: ["species", "animal", "Africa", "Asia"] },
  ],
  labelColumn: "Final Label",
  modelName: "claude-3-5-sonnet",
  columns: ["translated_text"],
  file: "pangolin_dataset.csv",
  status: "ready",
  codebook: [
    "Positive: sentences mentioning protection, conservation efforts, endangered status, or wildlife sanctuaries",
    "Negative: mentions of illegal trade, leather products, traditional medicine use, or consumption",
    "Neutral: factual statements about species distribution, habitat, or characteristics",
  ],
  userID: "demo-user",
  createdAt: new Date().toISOString(),
};

const samples = [
  "Just learned pangolins are the most trafficked mammals. We must strengthen enforcement against poachers and traders.",
  "Beautiful new pangolin leather belt I got from a friend traveling through Vietnam! So unique.",
  "The Chinese pangolin can be found in Southeast Asia and is listed as endangered by the IUCN.",
  "New sanctuary opened in Borneo dedicated to pangolin rehabilitation and release programs. Inspiring work!",
  "Traditional medicine practitioners continue using pangolin scales despite international ban.",
  "Governments must collaborate on cross-border wildlife enforcement to stop pangolin trafficking networks.",
];

export const demoAnnotations: AnnotationItem[] = samples.map((text, idx) => {
  const id = idx + 1;
  const labels = ["positive", "negative", "neutral"];
  const label = labels[idx % 3];
  return {
    _id: `a${String(id)}`,
    taskId: "demo-task-1",
    sampleId: id,
    sampleContent: { text },
    labels: [label],
    createdBy: "demo-user",
    source: "guide",
    aiAnnotation: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as AnnotationItem;
});
