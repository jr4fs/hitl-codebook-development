import express from "express";
import cors from "cors";
import accountRouter from "./routes/accounts";

export const app = express();

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use(cors());
app.use(express.json());

app.use("/api/account", accountRouter);
