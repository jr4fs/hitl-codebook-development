"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "";
const JWT_EXPIRES_IN = '1500m'; // Access token expires in 1500 minutes
const JWT_REFRESH_EXPIRES_IN = '7d'; // Refresh token expires in 7 days
function generateAccessToken(payload) {
    if (JWT_SECRET.length === 0) {
        console.log("JWT SECRET IS EMPTY");
    }
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
function generateRefreshToken(payload) {
    if (JWT_REFRESH_SECRET.length === 0) {
        console.log("JWT SECRET IS EMPTY");
    }
    return jsonwebtoken_1.default.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}
function verifyAccessToken(token) {
    if (JWT_SECRET.length === 0) {
        console.log("JWT SECRET IS EMPTY");
    }
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
function verifyRefreshToken(token) {
    if (JWT_REFRESH_SECRET.length === 0) {
        console.log("JWT SECRET IS EMPTY");
    }
    return jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET);
}
