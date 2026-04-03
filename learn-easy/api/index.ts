import express, { type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

const app = express();
const httpServer = createServer(app);

const PgSession = connectPgSimple(session);

function createSessionStore() {
  if (process.env.DATABASE_URL) {
    try {
      return new PgSession({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      } as any);
    } catch (e) {
      console.error("Session store init failed, using memory store:", e);
    }
  }
  return undefined;
}

app.use(
  session({
    store: createSessionStore(),
    secret: process.env.SESSION_SECRET || "learn-easy-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: false }));

let initialized = false;
let initializing: Promise<void> | null = null;

async function ensureInitialized() {
  if (initialized) return;
  if (!initializing) {
    initializing = (async () => {
      await registerRoutes(httpServer, app);
      app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        res.status(status).json({ message });
      });
      initialized = true;
    })();
  }
  await initializing;
}

export default async function handler(req: Request, res: Response) {
  try {
    await ensureInitialized();
    return app(req, res);
  } catch (err: any) {
    console.error("Handler error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
