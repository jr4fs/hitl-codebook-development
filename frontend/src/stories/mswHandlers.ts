import { http, HttpResponse } from "msw";
import { demoAnnotations, demoTask } from "./demoData";

const API = "http://localhost:8080";

export const handlersReady = [
  http.post(`${API}/api/tasks/create`, () => {
    return HttpResponse.json({
      success: true,
      taskId: "demo-task-1",
      task: demoTask,
      fileName: "demo.csv",
      message: "Task created. Sampling is pending.",
      valSummary: { rows: 120, columns: ["text", "task_label"] },
      restSummary: { rows: 880, columns: ["text"] },
    });
  }),
  http.get(`${API}/api/tasks/getTask/:taskId`, () => {
    return HttpResponse.json({ success: true, task: demoTask });
  }),
  http.get(`${API}/api/annotate/get-annotations/:taskId`, () => {
    return HttpResponse.json({ success: true, annotations: demoAnnotations });
  }),
  http.get(`${API}/api/tasks/getTasks`, () => {
    return HttpResponse.json({ success: true, tasks: [demoTask], count: 1 });
  }),
  http.post(`${API}/api/inference`, () => {
    return HttpResponse.json({
      label: ["Billing"],
      reason: "Payment or invoice related issue detected in the text.",
      span_text: "charged twice",
      raw_response: "mocked",
      system_prompt: "mocked-system-prompt",
      user_prompt: "mocked-user-prompt",
    });
  }),
  http.post(`${API}/api/inference/`, () => {
    return HttpResponse.json({
      label: ["Billing"],
      reason: "Payment or invoice related issue detected in the text.",
      span_text: "charged twice",
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
            "If text mentions duplicated or unexpected charges, label Billing.",
            "If text mentions crashes, timeouts, or loading loops, label Technical.",
          ],
        });
      }
      if (commitCount === 2) {
        return HttpResponse.json({
          success: true,
          rules: [
            "If text mentions password reset or lockout, label Account.",
            "If text mentions profile/email/access changes, label Account.",
          ],
        });
      }
      return HttpResponse.json({
        success: true,
        rules: [],
      });
    });
  })(),
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
