import os
from pymongo import MongoClient

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "annotationTool")

# Initialize client lazily
client = None
db = None

def get_db():
    """
    Returns the MongoDB database instance.
    Initializes the connection if it hasn't been established yet.
    """
    global client, db
    
    if client is None:
        try:
            print(f"Connecting to Annotation Tool MongoDB at {MONGODB_URI}...")
            client = MongoClient(MONGODB_URI)
            # Verify connection
            client.admin.command('ping')
            print("Successfully connected to Annotation Tool MongoDB!")
            db = client[DB_NAME]
        except Exception as e:
            print(f"Failed to connect to Annotation Tool MongoDB: {e}")
            raise e
            
    return db

def get_collection(collection_name):
    """
    Helper function to get a specific collection from the database
    """
    database = get_db()
    return database[collection_name]
