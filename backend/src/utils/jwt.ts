import jwt from 'jsonwebtoken';
import dotenv from "dotenv";
import { JWTPayload } from '@common/types/auth';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "";
const JWT_EXPIRES_IN = '15m'; // Access token expires in 15 minutes
const JWT_REFRESH_EXPIRES_IN = '7d'; // Refresh token expires in 7 days

export function generateAccessToken(payload: JWTPayload): string {
    if (JWT_SECRET.length === 0){
        console.log("JWT SECRET IS EMPTY");
    }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function generateRefreshToken(payload: JWTPayload): string {
     if (JWT_REFRESH_SECRET.length === 0){
        console.log("JWT SECRET IS EMPTY");
    }
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

export function verifyAccessToken(token: string): JWTPayload {
     if (JWT_SECRET.length === 0){
        console.log("JWT SECRET IS EMPTY");
    }
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export function verifyRefreshToken(token: string): JWTPayload {
     if (JWT_REFRESH_SECRET.length === 0){
        console.log("JWT SECRET IS EMPTY");
    }
  return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
}