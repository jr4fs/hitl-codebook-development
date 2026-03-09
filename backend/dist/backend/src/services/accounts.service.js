"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = createUser;
exports.loginUser = loginUser;
exports.refreshAccessToken = refreshAccessToken;
const database_service_1 = require("./database.service");
const jwt_1 = require("../utils/jwt");
const argon2_1 = __importDefault(require("argon2"));
function validateUsername(username) {
    var errors = [];
    if (username && username.length >= 3) {
        return {
            valid: true,
            errors,
        };
    }
    errors.push("Username must be at least 3 characters long");
    return {
        valid: errors.length == 0,
        errors,
    };
}
function validateEmail(email) {
    const errors = [];
    // Check if empty
    if (!email || email.trim() === "") {
        errors.push("Email is required");
    }
    // Basic email regex pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errors.push("Please enter a valid email address");
    }
    // Check for common issues
    if (email.includes("..")) {
        errors.push("Email cannot contain consecutive dots");
    }
    if (email.startsWith(".") || email.endsWith(".")) {
        errors.push("Email cannot start or end with a dot");
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
function validatePassword(password) {
    const errors = [];
    // Check minimum length
    if (password.length < 8) {
        errors.push("Password must be at least 8 characters long");
    }
    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
        errors.push("Password must contain at least one uppercase character");
    }
    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
        errors.push("Password must contain at least one lowercase character");
    }
    // Check for special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push("Password must contain at least one special character");
    }
    // Check for number
    if (!/[0-9]/.test(password)) {
        errors.push("Password must contain at least one number");
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
function validatePayload(payload) {
    const validUsername = validateUsername(payload.username);
    const validEmail = validateEmail(payload.email);
    const validPassword = validatePassword(payload.password);
    return {
        valid: validUsername.valid && validEmail.valid && validPassword.valid,
        usernameErrors: validUsername.errors,
        emailErrors: validEmail.errors,
        passwordErrors: validPassword.errors,
    };
}
async function hashPassword(password) {
    try {
        // argon2 handles salting automatically and uses secure defaults
        const hash = await argon2_1.default.hash(password);
        return hash;
    }
    catch (error) {
        throw new Error("Error hashing password");
    }
}
async function verifyPassword(password, hash) {
    try {
        // argon2.verify automatically extracts params from the hash
        const isMatch = await argon2_1.default.verify(hash, password);
        return isMatch;
    }
    catch (error) {
        throw new Error("Error verifying password");
    }
}
async function createUser(req, res) {
    const username = req.body.username;
    const email = req.body.email;
    try {
        const validationPayload = {
            username: req.body.username,
            email: req.body.email,
            password: req.body.password,
        };
        const payloadValidation = validatePayload(validationPayload);
        if (!payloadValidation.valid) {
            return res.status(400).json({
                success: false,
                errors: {
                    username: payloadValidation.usernameErrors,
                    email: payloadValidation.emailErrors,
                    password: payloadValidation.passwordErrors,
                },
            });
        }
        const userDetailsCollection = (0, database_service_1.getCollection)("UserDetails");
        // Check if email exists
        const existingUser = await userDetailsCollection.findOne({
            email: validationPayload.email,
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email already exists",
            });
        }
        //Creating a new user object with hashed password and creation timestamp
        const newUser = {
            username: validationPayload.username,
            email: validationPayload.email,
            password: await hashPassword(validationPayload.password),
            createdAt: new Date().toISOString(),
        };
        const result = await userDetailsCollection.insertOne(newUser);
        const auth_payload = {
            userId: result.insertedId.toString(),
            email: newUser.email,
            username: newUser.username,
        };
        const accessToken = (0, jwt_1.generateAccessToken)(auth_payload);
        const refreshToken = (0, jwt_1.generateRefreshToken)(auth_payload);
        res.status(201).json({
            success: true,
            message: "User created successfully",
            userId: result.insertedId.toString(),
            jwtToken: accessToken,
            jwtRefreshToken: refreshToken,
            user: {
                id: result.insertedId.toString(),
                email: newUser.email,
                username: newUser.username,
            },
        });
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Email already exists",
            });
        }
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create user",
        });
    }
}
async function loginUser(req, res) {
    try {
        const validationPayload = {
            email: req.body.email,
            password: req.body.password,
        };
        const userDetailsCollection = (0, database_service_1.getCollection)("UserDetails");
        // Check if email exists
        const existingUser = await userDetailsCollection.findOne({
            email: validationPayload.email,
        });
        if (!existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email or Password is incorrect",
            });
        }
        const correctPassword = await verifyPassword(validationPayload.password, existingUser.password);
        if (!correctPassword) {
            return res.status(400).json({
                success: false,
                message: "Email or Password is incorrect",
            });
        }
        const auth_payload = {
            userId: existingUser._id.toString(),
            email: existingUser.email,
            username: existingUser.username,
        };
        const accessToken = (0, jwt_1.generateAccessToken)(auth_payload);
        const refreshToken = (0, jwt_1.generateRefreshToken)(auth_payload);
        res.status(200).json({
            success: true,
            jwtToken: accessToken,
            jwtRefreshToken: refreshToken,
            message: "User Login was successful",
            user: {
                id: existingUser._id.toString(),
                email: existingUser.email,
                username: existingUser.username,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to login, Internal Server Error",
        });
    }
}
async function refreshAccessToken(req, res) {
    try {
        const { refreshToken } = req.body.token;
        if (!refreshToken) {
            console.log("Refresh token not present");
            return res.status(401).json({
                success: false,
                message: "Refresh token is required",
            });
        }
        // Verify the refresh token
        const decoded = (0, jwt_1.verifyRefreshToken)(refreshToken);
        // Generate new access token
        const newAccessToken = (0, jwt_1.generateAccessToken)({
            userId: decoded.userId,
            email: decoded.email,
            username: decoded.username,
        });
        res.status(200).json({
            success: true,
            accessToken: newAccessToken,
        });
    }
    catch (error) {
        console.log("Invalid or expired refresh token");
        res.status(401).json({
            success: false,
            message: "Invalid or expired refresh token",
        });
    }
}
