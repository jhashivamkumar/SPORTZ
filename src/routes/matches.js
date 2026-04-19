import express from "express";
import { matches } from "../db/schema.js";
import { db } from "../db/db.js";
import {
  createMatchSchema,
  listMatchesQuerySchema,
} from "../validation/matches.js";
import { desc } from "drizzle-orm";

const router = express.Router();

const MAX_LIMIT = 100;

// Helper function to determine match status based on dates
function getMatchStatus(startTime, endTime) {
  const now = new Date();
  if (now < startTime) return "scheduled";
  if (now > endTime) return "finished";
  return "live";
}

// GET route for listing matches
router.get("/", async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({  error: "Invalid payload.", details: JSON.stringify(parsed.error.errors),  });
  }

    const limit = Math.min(parsed.data.limit || 10, MAX_LIMIT);
  

    try {
        const matchesList = await db
        .select()
        .from(matches)
        .orderBy(desc(matches.createdAt))
        .limit(limit);
        
        res.json({ matchesList });
    }
    catch (error) {
      console.error("Error fetching matches:", error);
      return res.status(500).json({ error: "Failed to fetch matches.", details: JSON.stringify(error) });
    }

});

// POST route for creating a match
router.post("/", async (req, res) => {
  const parsedData = createMatchSchema.safeParse(req.body);

  if (!parsedData.success) {
    return res.status(400).json({
      error: "Invalid payload.",
      details: JSON.stringify(parsedData.error.errors),
    });
  }

  try {
    const { startTime, endTime, homeScore, awayScore } = parsedData.data;

    const [event] = await db
      .insert(matches)
      .values({
        ...parsedData.data,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        homeScore: homeScore || 0,
        awayScore: awayScore || 0,
        status: getMatchStatus(new Date(startTime), new Date(endTime)),
      })
      .returning();

    res.status(201).json({ data: event });
  } catch (error) {
    console.error("Error creating match:", error);
    res.status(500).json({
      error: "Failed to create match.",
      details: JSON.stringify(error),
    });
  }
});

export default router;
