import { http, HttpResponse } from "msw";
import { demoAnnotations, demoTask } from "./demoData";

// Wildcard origin so the demo's mocked endpoints match regardless of where it is
// served from: localhost in dev, GitHub Pages, or the deployed same-origin build
// (where apiClient uses a relative baseURL). MSW resolves "*" against any origin.
const API = "*";

export const handlersReady = [
  http.post(`${API}/api/account/login`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
    };
    const email = body?.email || "demo@example.com";
    const username = email.split("@")[0] || "demo";

    return HttpResponse.json({
      success: true,
      jwtToken: "demo-jwt-token",
      jwtRefreshToken: "demo-refresh-token",
      user: {
        id: "demo-user",
        name: "Demo User",
        username,
        email,
      },
      message: "Login successful",
    });
  }),
  http.post(`${API}/api/tasks/create`, () => {
    return HttpResponse.json({
      success: true,
      taskId: "demo-task-1",
      task: { ...demoTask, status: "ready" },
      fileName: "demo.csv",
      message: "Task created successfully.",
      valSummary: { rows: 120, columns: ["text", "task_label"] },
      restSummary: { rows: 880, columns: ["text"] },
    });
  }),
  http.get(`${API}/api/tasks/getTask/:taskId`, () => {
    return HttpResponse.json({ success: true, task: { ...demoTask, status: "ready" } });
  }),
  http.get(`${API}/api/annotate/get-annotations/:taskId`, () => {
    return HttpResponse.json({ success: true, annotations: demoAnnotations });
  }),
  http.get(`${API}/api/tasks/getTasks`, () => {
    return HttpResponse.json({ success: true, tasks: [{ ...demoTask, status: "ready" }], count: 1 });
  }),
  http.delete(`${API}/api/tasks/delete/:taskId`, () => {
    // Storybook no-op: keep demo task list stable after delete action.
    return HttpResponse.json({
      success: true,
      message: "No-op in demo mode",
      deletedTaskId: null,
      deletedFilesCount: 0,
      deletedAnnotationsCount: 0,
    });
  }),
  http.post(`${API}/api/inference`, () => {
    return HttpResponse.json({
      label: ["crisis_intervention"],
      reason: "YP is presenting with acute psychiatric symptoms including paranoid ideation and flight of ideas, requiring immediate risk assessment and intervention.",
      span_text: "flight of ideas about being hurt by others... paranoia",
      raw_response: "mocked",
      system_prompt: "mocked-system-prompt",
      user_prompt: "mocked-user-prompt",
    });
  }),
  http.post(`${API}/api/inference/`, () => {
    return HttpResponse.json({
      label: ["crisis_intervention"],
      reason: "YP is presenting with acute psychiatric symptoms including paranoid ideation and flight of ideas, requiring immediate risk assessment and intervention.",
      span_text: "flight of ideas about being hurt by others... paranoia",
      raw_response: "mocked",
      system_prompt: "mocked-system-prompt",
      user_prompt: "mocked-user-prompt",
    });
  }),
  http.post(`${API}/api/annotate/update-guide`, () => {
    return HttpResponse.json({ success: true, message: "Guide annotation updated" });
  }),
  (() => {
    let commitCount = 0;
    return http.post(`${API}/api/inference/rule-synthesis`, () => {
      commitCount += 1;
      if (commitCount === 1) {
        return HttpResponse.json({
          success: true,
          rules: [
            "If note describes flight of ideas, paranoid ideation, or unresponsiveness to prompts, label crisis_intervention.",
            "If note involves inter-agency emails, court coordination, or external referrals, label service_coordination.",
          ],
        });
      }
      if (commitCount === 2) {
        return HttpResponse.json({
          success: true,
          rules: [
            "If note documents a risk assessment or acute safety concern, label crisis_intervention.",
            "If note describes a routine check-in, basic needs support, or emotional follow-up without crisis indicators, label routine_support.",
          ],
        });
      }
      return HttpResponse.json({
        success: true,
        rules: [],
      });
    });
  })(),
  http.post(`${API}/api/tasks/upload-bundle`, () => {
    return HttpResponse.json({
      success: true,
      taskId: "demo-task-1",
      task: demoTask,
      status: "ready",
      message: "Bundle uploaded and task created",
    });
  }),
  http.post(`${API}/api/embedding`, () => {
    return HttpResponse.json({ success: true, message: "Embedding processed" });
  }),
  http.post(`${API}/api/tasks/saveCodebook`, () => {
    return HttpResponse.json({ success: true, message: "Codebook saved" });
  }),
  http.post(`${API}/api/tasks/exportCodebook`, () => {
    return HttpResponse.json({ success: true, message: "Codebook exported" });
  }),
  http.post(`${API}/api/metrics/samples`, () => {
    return HttpResponse.json({ success: true, filename: "sample_metrics_demo.csv" });
  }),
  http.post(`${API}/api/metrics/metadata`, () => {
    return HttpResponse.json({ success: true, filename: "metadata_metrics_demo.csv" });
  }),
  http.post(`${API}/api/metrics/batches`, () => {
    return HttpResponse.json({ success: true, filename: "batch_metrics_demo.csv" });
  }),
  http.post(`${API}/api/metrics/val-eval`, () => {
    return HttpResponse.json({
      success: true,
      macroF1: 0.9,
      macroPrecision: 0.91,
      macroRecall: 0.89,
      accuracy: 0.9,
      filename: "val_eval_demo.csv",
      predictionsFilename: "val_eval_predictions_demo.csv",
    });
  }),
  http.get(`${API}/api/metrics/val-eval/progress/:taskId`, () => {
    return HttpResponse.json({ completed: 15, total: 15, done: true });
  }),
  http.post(`${API}/api/metrics/val-eval/cancel`, () => {
    return HttpResponse.json({ success: true });
  }),
  http.post(`${API}/api/tasks/final-inference`, () => {
    return HttpResponse.json({ success: true, taskId: "demo-task" });
  }),
  http.get(`${API}/api/tasks/auto-label/progress/:taskId`, () => {
    return HttpResponse.json({
      completed: 3,
      total: 3,
      done: true,
      rows: [
        { text: "Sample post one", generated_label: "positive" },
        { text: "Sample post two", generated_label: "negative" },
        { text: "Sample post three", generated_label: "not relevant" },
      ],
    });
  }),
];

export const handlersSamplingPending = [
  http.get(`${API}/api/tasks/getTask/:taskId`, () => {
    return HttpResponse.json({ success: true, task: { ...demoTask, status: "sampling_pending" } });
  }),
  http.get(`${API}/api/annotate/get-annotations/:taskId`, () => {
    return HttpResponse.json({ success: true, annotations: [] });
  }),
  http.get(`${API}/api/tasks/getTasks`, () => {
    return HttpResponse.json({ success: true, tasks: [{ ...demoTask, status: "sampling_pending" }], count: 1 });
  }),
];

export const handlersSamplingError = [
  http.get(`${API}/api/tasks/getTask/:taskId`, () => {
    return HttpResponse.json({
      success: true,
      task: { ...demoTask, status: "sampling_error" },
    });
  }),
  http.get(`${API}/api/annotate/get-annotations/:taskId`, () => {
    return HttpResponse.json({ success: true, annotations: [] });
  }),
  http.get(`${API}/api/tasks/getTasks`, () => {
    return HttpResponse.json({
      success: true,
      tasks: [{ ...demoTask, status: "sampling_error" }],
      count: 1,
    });
  }),
];

export const handlersEmpty = [
  http.get(`${API}/api/tasks/getTask/:taskId`, () => {
    return HttpResponse.json({ success: true, task: null });
  }),
  http.get(`${API}/api/annotate/get-annotations/:taskId`, () => {
    return HttpResponse.json({ success: true, annotations: [] });
  }),
  http.get(`${API}/api/tasks/getTasks`, () => {
    return HttpResponse.json({ success: true, tasks: [], count: 0 });
  }),
];

export const handlersPermissionDenied = [
  http.get(`${API}/api/tasks/getTask/:taskId`, () => {
    return HttpResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 },
    );
  }),
  http.get(`${API}/api/annotate/get-annotations/:taskId`, () => {
    return HttpResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 },
    );
  }),
  http.get(`${API}/api/tasks/getTasks`, () => {
    return HttpResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 },
    );
  }),
];

export const handlersServerError = [
  http.get(`${API}/api/tasks/getTask/:taskId`, () => {
    return HttpResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }),
  http.get(`${API}/api/annotate/get-annotations/:taskId`, () => {
    return HttpResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }),
  http.get(`${API}/api/tasks/getTasks`, () => {
    return HttpResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }),
];

export function handlersSamplingTransition() {
  let reads = 0;

  return [
    http.get(`${API}/api/tasks/getTask/:taskId`, () => {
      reads += 1;
      const status = reads < 6 ? "sampling_pending" : "ready";
      return HttpResponse.json({
        success: true,
        task: { ...demoTask, status },
      });
    }),
    http.get(`${API}/api/annotate/get-annotations/:taskId`, () => {
      return HttpResponse.json({ success: true, annotations: demoAnnotations });
    }),
    http.get(`${API}/api/tasks/getTasks`, () => {
      return HttpResponse.json({ success: true, tasks: [demoTask], count: 1 });
    }),
    http.post(`${API}/api/tasks/upload`, () => {
      return HttpResponse.json({
        success: true,
        message: "Upload successful",
        filePath: "demo.csv",
      });
    }),
    http.post(`${API}/api/tasks/createTask`, () => {
      return HttpResponse.json({
        success: true,
        message: "Task created",
        taskId: "demo-task-1",
      });
    }),
  ];
}

export const handlersWildlife = handlersReady;
