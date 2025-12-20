import { Router } from "express";
import { createUser, loginUser } from "src/services/accounts.service";
const router = Router();

router.post("/create-user", createUser);
router.post("/create-user", loginUser);