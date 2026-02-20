import express from "express";
import cors from "cors";
import accountRouter from "./routes/accounts";
import tasksRouter from "./routes/tasks";
import anonymizeRouter from "./routes/anonymize";
import annotationsRouter from "./routes/annotations";

export const app = express();

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use(cors({
	exposedHeaders: ["Content-Disposition", "X-Filename"]
}));
app.use(express.json());

app.use("/api/account", accountRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/anonymize", anonymizeRouter);
app.use("/api/annotate", annotationsRouter);
