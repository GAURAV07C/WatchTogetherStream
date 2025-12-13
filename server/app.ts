import { type Server } from "node:http";
/**
 * Node ka HTTP Server type
 * Baad me server.listen() ke liye use hota hai
 */

import express, {
  type Express,
  type Request,
  Response,
  NextFunction,
} from "express";

/**
 * Express framework
 * Typescript ke types (Express, Request, Response)
 */

import { registerRoutes } from "./routes";
/**
 * Tumhari API + socket routes yahin register hoti hain
 * Ye function HTTP server return karta hai
 */


// Custom logger function
export function log(message: string, source = "express") {
  // Time ke saath formatted log print karta hai
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  // 10:42:13 AM [express] GET /api/room 200 in 12ms

  console.log(`${formattedTime} [${source}] ${message}`);
}
/**
 * Ye single express instance hai
 * Isko dev & prod dono me reuse kiya jaata hai
 */
export const app = express();


// rawBody
declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

/**
 * Node ke request object me custom property add kar rahe ho
 * TypeScript ko bata rahe ho:
 * req.rawBody valid hai
 */
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));

/**
 * Raw request body buffer form me save hoti hai
 * * * Use cases: * * *
 * Webhooks (Stripe, Razorpay, etc.)
 * Signature verification
 * Debugging exact payload
 */

app.use(express.urlencoded({ extended: false }));
// Form data parse


app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

export default async function runApp(
  setup: (app: Express, server: Server) => Promise<void>,
) {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly run the final setup after setting up all the other routes so
  // the catch-all route doesn't interfere with the other routes
  await setup(app, server);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
}
