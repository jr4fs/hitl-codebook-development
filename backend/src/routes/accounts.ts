import { Router } from "express";
import { createUser, loginUser, refreshAccessToken } from "../services/accounts.service";
const router = Router();

router.post("/signup", createUser);
router.post("/login", loginUser);
router.post('/refresh', refreshAccessToken);

export default router;