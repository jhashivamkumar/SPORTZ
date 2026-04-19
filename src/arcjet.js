import arcjet, { detectBot, shield } from "@arcjet/node";
import { duration } from "drizzle-orm/gel-core";

const arcjetKey = process.env.ARCJET_API_KEY;
const arcjetMode = process.env.ARCJET_MODE === "DRY_RUN" ? "DRY_RUN" : "LIVE";

if (!arcjetKey) {
  throw new Error("ARCJET_API_KEY is not defined in environment variables");
}

export const httpArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({
          mode: arcjetMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
          slideWindow: ({mode:arcjetMode, interval:'10s',max:2}),
        }),
      ],
    })
  : null;

export const wsArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({
          mode: arcjetMode, 
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
          slideWindow: ({mode:arcjetMode, interval:'10s',max:50}),
        }),
      ],
    })
  : null;

export const securityMiddleware = (req, res, next) => {
  if (!httpArcjet) {
    return next();
  }

  httpArcjet
    .protect(req)
    .then((decision) => {
      if (decision.isDenied) {
        if (decision.reason.isRateLimit) {
          return res.status(429).json({ error: "Too Many Requests" });
        }
        return res.status(403).json({ error: "Forbidden" });
      }
      next();
    })
    .catch((error) => {
      console.error("Error in Arcjet middleware:", error);
      res.status(503).json({ error: "Service Unavailable" });
    });
};
