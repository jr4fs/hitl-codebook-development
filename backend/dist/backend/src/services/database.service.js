"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToMongo = connectToMongo;
exports.getDb = getDb;
exports.getCollection = getCollection;
exports.closeMongo = closeMongo;
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const DB_CONN = process.env.DB_CONN_STRING || "";
const DB_NAME = process.env.DB_NAME || "";
let client = null;
let db = null;
async function connectToMongo() {
    if (db)
        return db;
    client = new mongodb_1.MongoClient(DB_CONN);
    await client.connect();
    db = client.db(DB_NAME);
    console.log("Connected to Annotation Tool MongoDB");
    await setupIndexes();
    return db;
}
function getDb() {
    if (!db)
        throw new Error("MongoDB not connected");
    return db;
}
function getCollection(name) {
    return getDb().collection(name);
}
async function closeMongo() {
    if (client) {
        await client.close();
        client = null;
        db = null;
        console.log("Annotation Tool MongoDB connection closed");
    }
}
async function setupIndexes() {
    try {
        const userDetailsCollectionName = process.env.USER_DETAILS_COLLECTION_NAME || "";
        if (userDetailsCollectionName) {
            const userCollection = getCollection(userDetailsCollectionName);
            // Create unique index on email field
            await userCollection.createIndex({ email: 1 }, { unique: true });
            console.log(`Created unique index on email for ${userDetailsCollectionName}`);
        }
    }
    catch (e) {
        if (e instanceof Error) {
            console.error("Error setting up indexes:", e.message);
        }
    }
}
