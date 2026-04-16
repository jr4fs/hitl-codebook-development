import { Router, Response } from "express";
import axios from "axios";
import { AuthRequest, authenticateToken } from "../middleware/auth.middleware";
import { EmbedDatasetRequest } from "@common/types/embedding";

const router = Router();
const ML_BASE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

//Adding user authentication, making this a protected route
router.use(authenticateToken);

router.post("/representative", async (req: AuthRequest, res: Response) => {
    try {
        const payload: EmbedDatasetRequest = req.body;
        const { data } = await axios.post(`${ML_BASE_URL}/embedding/representative`, payload);
        res.json(data);
    } catch (error: any) {
        const status = error.response?.status ?? 500;
        const error_msg = error.response?.data?.detail ?? "Representative sampling request failed";
        res.status(status).json({ success: false, message: error_msg });
    }
});

router.post("/coverage", async (req: AuthRequest, res: Response) => {
    try {
        const payload: EmbedDatasetRequest = req.body;
        const { data } = await axios.post(`${ML_BASE_URL}/embedding/coverage`, payload);
        res.json(data);
    } catch (error: any) {
        const status = error.response?.status ?? 500;
        const error_msg = error.response?.data?.detail ?? "Coverage sampling request failed";
        res.status(status).json({ success: false, message: error_msg });
    }
});

export default router;