import express from "express";
import cors from "cors";
import accountRouter from "./routes/accounts";
import tasksRouter from "./routes/tasks";
import annotationsRouter from "./routes/annotations";

export const app = express();

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use(cors());
app.use(express.json());

app.use("/api/account", accountRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/annotate", annotationsRouter);
