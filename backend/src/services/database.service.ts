import { MongoClient, Db, Collection, Document } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const DB_CONN = process.env.DB_CONN_STRING || "";
const DB_NAME = process.env.DB_NAME || "";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToMongo() {
  if (db) return db;
  client = new MongoClient(DB_CONN);
  await client.connect();
  db = client.db(DB_NAME);
  console.log("Connected to PocketLLM MongoDB");

  await setupIndexes();

  return db;
}

export function getDb(): Db {
  if (!db) throw new Error("MongoDB not connected");
  return db;
}

export function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

export async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("PocketLLM MongoDB connection closed");
  }
}

async function setupIndexes(): Promise<void> {
  try {
    const userDetailsCollectionName = process.env.USER_DETAILS_COLLECTION_NAME || "";
    
    if (userDetailsCollectionName) {
      const userCollection = getCollection(userDetailsCollectionName);
      
      // Create unique index on email field
      await userCollection.createIndex(
        { email: 1 },
        { unique: true }
      );
      
      console.log(`Created unique index on email for ${userDetailsCollectionName}`);
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error("Error setting up indexes:", e.message);
    }
  }
}
