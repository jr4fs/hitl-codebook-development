"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const accounts_1 = __importDefault(require("./routes/accounts"));
const tasks_1 = __importDefault(require("./routes/tasks"));
// import anonymizeRouter from "./routes/anonymize";
const annotations_1 = __importDefault(require("./routes/annotations"));
exports.app = (0, express_1.default)();
exports.app.get("/health", (_req, res) => res.json({ status: "ok" }));
exports.app.use((0, cors_1.default)({
    exposedHeaders: ["Content-Disposition", "X-Filename"],
}));
exports.app.use(express_1.default.json());
exports.app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on("finish", () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        console.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)} ms`);
    });
    next();
});
exports.app.use("/api/account", accounts_1.default);
exports.app.use("/api/tasks", tasks_1.default);
// Anonymization is temporarily disabled in the new flow.
// app.use("/api/anonymize", anonymizeRouter);
exports.app.use("/api/annotate", annotations_1.default);
