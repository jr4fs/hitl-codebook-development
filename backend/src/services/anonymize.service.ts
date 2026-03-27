import { Response } from "express";
import {
  AnonymizeConfig,
  UpdateAnonymizeConfigRequest,
} from "@common/types/anonymize";
import { getCollection } from "./database.service";
import { AuthRequest } from "./tasks.service";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import axios from "axios";

const ANONYMIZE_CONFIG_COLLECTION = "AnonymizeConfig";
const CONFIG_DOC_ID = "global";
const PYBACKEND_URL = process.env.PYBACKEND_URL || "http://localhost:8000";

const PROJECT_ROOT = path.resolve(__dirname, "../../../");
const NAMES_FILE_PATH = path.join(
  PROJECT_ROOT,
  "shared_uploads",
  "anonymize",
  "names.csv",
);

/**
 * Fetches the default anonymization config from pybackend (parsed from config.yaml)
 */
async function fetchDefaultConfig(): Promise<Omit<AnonymizeConfig, "_id">> {
  try {
    const response = await axios.get(`${PYBACKEND_URL}/anonymize/defaults`);
    if (response.data?.success && response.data?.defaults) {
      return {
        ...response.data.defaults,
        updatedAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error("Failed to fetch defaults from pybackend:", error);
  }

  // Fallback defaults if pybackend is unavailable
  return {
    anonymizeEnabled: true,
    ageEnabled: true,
    emailEnabled: true,
    phoneEnabled: true,
    pronounEnabled: false,
    phrases: [],
    skipWords: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Retrieves the global anonymization config from DB (or defaults from pybackend)
 */
export async function getAnonymizeConfig(req: AuthRequest, res: Response) {
  try {
    const userID = req.user?.userId;
    if (!userID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - user not authenticated",
      });
    }

    const collection = getCollection<AnonymizeConfig>(
      ANONYMIZE_CONFIG_COLLECTION,
    );
    let config = await collection.findOne({ _id: CONFIG_DOC_ID as any });

    if (!config) {
      // Return default config from pybackend if none exists
      const defaults = await fetchDefaultConfig();
      config = { _id: CONFIG_DOC_ID, ...defaults } as any;
    }

    return res.status(200).json({
      success: true,
      config,
    });
  } catch (error: any) {
    console.error("Error retrieving anonymize config:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve config",
    });
  }
}

/**
 * Updates the global anonymization config
 */
export async function updateAnonymizeConfig(req: AuthRequest, res: Response) {
  try {
    const userID = req.user?.userId;
    if (!userID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - user not authenticated",
      });
    }

    const updates: UpdateAnonymizeConfigRequest = req.body;
    const collection = getCollection<AnonymizeConfig>(
      ANONYMIZE_CONFIG_COLLECTION,
    );

    // Get existing config or defaults from pybackend
    let existing = await collection.findOne({ _id: CONFIG_DOC_ID as any });
    const baseConfig = existing || {
      _id: CONFIG_DOC_ID,
      ...(await fetchDefaultConfig()),
    };

    // Merge updates
    const updatedConfig: AnonymizeConfig = {
      ...baseConfig,
      anonymizeEnabled: updates.anonymizeEnabled ?? baseConfig.anonymizeEnabled,
      ageEnabled: updates.ageEnabled ?? baseConfig.ageEnabled,
      emailEnabled: updates.emailEnabled ?? baseConfig.emailEnabled,
      phoneEnabled: updates.phoneEnabled ?? baseConfig.phoneEnabled,
      pronounEnabled: updates.pronounEnabled ?? baseConfig.pronounEnabled,
      phrases: updates.phrases ?? baseConfig.phrases,
      skipWords: updates.skipWords ?? baseConfig.skipWords,
      updatedAt: new Date().toISOString(),
    };

    // Upsert the config
    await collection.updateOne(
      { _id: CONFIG_DOC_ID as any },
      { $set: updatedConfig },
      { upsert: true },
    );

    return res.status(200).json({
      success: true,
      config: updatedConfig,
      message: "Configuration updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating anonymize config:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update config",
    });
  }
}

/**
 * Downloads the current names.csv file
 */
export async function downloadNamesFile(req: AuthRequest, res: Response) {
  try {
    const userID = req.user?.userId;
    if (!userID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - user not authenticated",
      });
    }

    if (!existsSync(NAMES_FILE_PATH)) {
      return res.status(404).json({
        success: false,
        message: "Names file not found",
      });
    }

    const collection = getCollection<AnonymizeConfig>(
      ANONYMIZE_CONFIG_COLLECTION,
    );
    const config = await collection.findOne({ _id: CONFIG_DOC_ID as any });
    const requestedName = config?.namesFileName || "names.csv";
    const safeName = path.basename(requestedName);

    res.setHeader("X-Filename", safeName);
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Disposition, X-Filename",
    );
    res.download(NAMES_FILE_PATH, safeName);
  } catch (error: any) {
    console.error("Error downloading names file:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to download file",
    });
  }
}

/**
 * Uploads and replaces the names.csv file
 */
export async function uploadNamesFile(req: AuthRequest, res: Response) {
  try {
    const userID = req.user?.userId;
    if (!userID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - user not authenticated",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided",
      });
    }

    // Ensure directory exists
    const dirPath = path.dirname(NAMES_FILE_PATH);
    if (!existsSync(dirPath)) {
      await fs.mkdir(dirPath, { recursive: true });
    }

    // Write the uploaded file to names.csv location
    await fs.writeFile(NAMES_FILE_PATH, req.file.buffer, "utf-8");

    const collection = getCollection<AnonymizeConfig>(
      ANONYMIZE_CONFIG_COLLECTION,
    );
    await collection.updateOne(
      { _id: CONFIG_DOC_ID as any },
      {
        $set: {
          namesFileName: req.file.originalname,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true },
    );

    return res.status(200).json({
      success: true,
      message: "Names file uploaded successfully",
    });
  } catch (error: any) {
    console.error("Error uploading names file:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload file",
    });
  }
}
