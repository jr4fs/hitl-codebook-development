import dotenv from "dotenv";
import { app } from "./app";
import { connectToMongo } from "./services/database.service"
dotenv.config();

const PORT = process.env.PORT || 8080;

async function start() {
  await connectToMongo()
} 

const server = app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}/api`);
  });

start();