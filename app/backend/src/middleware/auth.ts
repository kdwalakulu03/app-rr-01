import { Request, Response, NextFunction } from 'express';
import { createVerify } from 'crypto';
import { AppError } from './errorHandler.js';

// Extend Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        dbId?: number;
        activeRole?: string;
      };
    }
  }
}

// ============================================
// Firebase Token Verification (no Admin SDK needed)
// Verifies tokens using Google's public certificates
// ============================================

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'near-now2';
const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const EXPECTED_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;

// Cache Google public certificates (refresh hourly)
let cachedCerts: Record<string, string> | null = null;
let certsCacheTime = 0;
const CACHE_TTL_MS = 3600_000; // 1 hour

async function getGoogleCerts(): Promise<Record<string, string>> {
  if (cachedCerts && Date.now() - certsCacheTime < CACHE_TTL_MS) {
    return cachedCerts;
  }
  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) throw new Error(`Failed to fetch Google certs: ${res.status}`);
  cachedCerts = (await res.json()) as Record<string, string>;
  certsCacheTime = Date.now();
  return cachedCerts;
}

function decodeBase64Url(str: string): string {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
}

interface FirebaseTokenPayload {
  uid: string;
  email?: string;
  sub: string;
  aud: string;
  iss: string;
  exp: number;
  iat: number;
  auth_time: number;
  [key: string]: unknown;
}

/**
 * Verify a Firebase ID token using Google's public certificates.
 * Same security as firebase-admin verifyIdToken(), but without needing a service account.
 */
async function verifyFirebaseToken(token: string): Promise<FirebaseTokenPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Token is not a valid JWT');
  }

  // Decode header and payload
  const header = JSON.parse(decodeBase64Url(parts[0]));
  const payload = JSON.parse(decodeBase64Url(parts[1])) as FirebaseTokenPayload;

  // 1. Verify algorithm
  if (header.alg !== 'RS256') {
    throw new Error(`Unsupported algorithm: ${header.alg}`);
  }

  // 2. Verify claims
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp <= now) {
    throw new Error('Token expired');
  }
  if (payload.iat > now + 5) {
    throw new Error('Token issued in the future');
  }
  if (payload.aud !== FIREBASE_PROJECT_ID) {
    throw new Error(`Invalid audience: expected ${FIREBASE_PROJECT_ID}`);
  }
  if (payload.iss !== EXPECTED_ISSUER) {
    throw new Error(`Invalid issuer: expected ${EXPECTED_ISSUER}`);
  }
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Missing or invalid sub claim');
  }

  // 3. Verify signature against Google's public certificates
  const certs = await getGoogleCerts();
  const cert = certs[header.kid];
  if (!cert) {
    // Key might have rotated — force refresh and retry once
    cachedCerts = null;
    const freshCerts = await getGoogleCerts();
    const freshCert = freshCerts[header.kid];
    if (!freshCert) {
      throw new Error('Unknown signing key ID');
    }
    return verifySignature(parts, freshCert, payload);
  }

  return verifySignature(parts, cert, payload);
}

function verifySignature(
  parts: string[],
  cert: string,
  payload: FirebaseTokenPayload
): FirebaseTokenPayload {
  const verify = createVerify('RSA-SHA256');
  verify.update(`${parts[0]}.${parts[1]}`);
  const signatureValid = verify.verify(cert, parts[2], 'base64url');
  if (!signatureValid) {
    throw new Error('Invalid token signature');
  }
  payload.uid = payload.sub;
  return payload;
}

console.log(`🔐 Firebase auth configured for project: ${FIREBASE_PROJECT_ID}`);

// ============================================
// Express Middleware
// ============================================

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No authorization token provided', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      const decoded = await verifyFirebaseToken(token);
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
      };
      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Token verification failed';
      throw new AppError(message, 401, 'INVALID_TOKEN');
    }
  } catch (error) {
    next(error);
  }
}

// Optional auth — sets user if valid token present, but doesn't require it
export async function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      try {
        const decoded = await verifyFirebaseToken(token);
        req.user = {
          uid: decoded.uid,
          email: decoded.email,
        };
      } catch {
        // Token invalid — that's fine for optional auth
      }
    }

    next();
  } catch {
    next();
  }
}
