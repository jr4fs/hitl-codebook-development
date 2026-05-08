import type { Task } from "@common/types/tasks";
import type { AnnotationItem } from "@common/types/annotations";

export const demoTask: Task = {
  _id: "demo-task-1",
  name: "Customer Support Intent Classification",
  description: "Classify support tickets by intent for triage automation.",
  type: "Multiclass",
  labels: [
    { name: "Billing", description: "Payments, invoices, and charges" },
    { name: "Technical", description: "Bugs, outages, feature failures" },
    { name: "Account", description: "Login, profile, access, permissions" },
  ],
  columns: ["text"],
  file: "demo.csv",
  status: "ready",
  codebook: [
    "Billing: payment failed, chargeback, invoice mismatch",
    "Technical: app crashed, timeout, bug report",
    "Account: password reset, MFA lockout, account recovery",
    "Billing: duplicate renewal or unexpected subscription charge",
    "Technical: export/reporting errors and stale loading states",
  ],
  userID: "demo-user",
};

const samples = [
  "I was charged twice for last month.",
  "The app crashes every time I open reports.",
  "I cannot reset my account password.",
  "My invoice total does not match my contract.",
  "Dashboard is stuck on loading for 10 minutes.",
  "Please update my account email and phone number.",
];

export const demoAnnotations: AnnotationItem[] = samples.map((text, idx) => {
  const id = idx + 1;
  const label = idx % 3 === 0 ? "Billing" : idx % 3 === 1 ? "Technical" : "Account";
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
