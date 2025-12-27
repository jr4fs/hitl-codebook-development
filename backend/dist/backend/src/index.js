"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = require("./app");
const database_service_1 = require("./services/database.service");
dotenv_1.default.config();
const PORT = process.env.PORT || 8080;
async function start() {
    await (0, database_service_1.connectToMongo)();
}
const server = app_1.app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}/api`);
});
start();
