import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

export interface AuthenticatedRequest extends Request {
    userId?: string;
}

/**
 * Verify a JWT token.
 * Tries HS256 with JWT secret first (fast, offline).
 * Falls back to Supabase's /auth/v1/user endpoint (works with any signing method).
 */
async function verifyToken(token: string): Promise<string> {
    // Strategy 1: HS256 with JWT secret (fast, offline — works for standard Supabase)
    if (SUPABASE_JWT_SECRET) {
        try {
            const decoded = jwt.verify(token, SUPABASE_JWT_SECRET, {
                algorithms: ["HS256"],
            });
            if (decoded && typeof decoded === "object" && (decoded as jwt.JwtPayload).sub) {
                return (decoded as jwt.JwtPayload).sub!;
            }
        } catch (e) {
            console.log("HS256 verification failed, trying Supabase API:", (e as Error).message);
        }
    }

    // Strategy 2: Ask Supabase to verify its own token (always works)
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
                Authorization: `Bearer ${token}`,
                apikey: SUPABASE_ANON_KEY,
            },
        });

        if (!resp.ok) {
            const body = await resp.text().catch(() => "");
            throw new Error(`Token rejected by Supabase (${resp.status}): ${body}`);
        }

        const user = await resp.json() as { id?: string };
        if (user.id) {
            return user.id;
        }
        throw new Error("Supabase returned user without id");
    }

    throw new Error("No verification method available (set SUPABASE_JWT_SECRET or SUPABASE_ANON_KEY)");
}

/**
 * Express middleware that verifies the Supabase JWT from the Authorization header.
 * Rejects with 401 if the token is missing, invalid, or expired.
 */
export function requireAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void {
    if (!SUPABASE_URL) {
        console.error("SUPABASE_URL is not configured");
        res.status(500).json({ error: "Server configuration error (missing SUPABASE_URL)" });
        return;
    }

    if (!SUPABASE_JWT_SECRET && !SUPABASE_ANON_KEY) {
        console.error("No auth verification method configured (need SUPABASE_JWT_SECRET or SUPABASE_ANON_KEY)");
        res.status(500).json({ error: "Server configuration error (missing auth config)" });
        return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Nicht autorisiert — fehlender Token" });
        return;
    }

    const token = authHeader.slice(7);

    verifyToken(token)
        .then((userId) => {
            req.userId = userId;
            next();
        })
        .catch((err) => {
            console.error("JWT verification failed:", err.message);
            res.status(401).json({ error: `Nicht autorisiert — ${err.message}` });
        });
}
