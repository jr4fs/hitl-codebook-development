"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const accounts_service_1 = require("../services/accounts.service");
const router = (0, express_1.Router)();
router.post("/signup", accounts_service_1.createUser);
router.post("/login", accounts_service_1.loginUser);
router.post('/refresh', accounts_service_1.refreshAccessToken);
exports.default = router;
