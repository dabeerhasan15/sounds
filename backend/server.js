// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Enhanced Sound Facts prompt
const SOUND_FACTS_PROMPT = `You are a professional music analyst. Analyze the given song and return ONLY a valid JSON object with this exact structure:

{
  "song": "song title",
  "artist": "artist name",
  "year": "release year (e.g., 1975)",
  "genre": "genre(s)",
  "runtime": "duration (e.g., 5:55)",
  "summary": "2-3 sentence professional summary of the song",
  "core_categories": {
    "emotional_honesty": {
      "score": 1-10,
      "comment": "brief explanation"
    },
    "storytelling": {
      "score": 1-10,
      "comment": "brief explanation"
    },
    "melodic_complexity": {
      "score": 1-10,
      "comment": "brief explanation"
    },
    "vocal_performance": {
      "score": 1-10,
      "comment": "brief explanation"
    },
    "production_quality": {
      "score": 1-10,
      "comment": "brief explanation"
    },
    "cultural_imprint": {
      "score": 1-10,
      "comment": "brief explanation"
    },
    "replay_value": {
      "score": 1-10,
      "comment": "brief explanation"
    },
    "overall_impact": {
      "score": 1-10,
      "comment": "brief explanation"
    }
  },
  "expansion_categories": [
    {
      "category": "category name",
      "score": 1-10,
      "comment": "explanation"
    }
  ],
  "final_score": 1-10
}

Ensure all scores are integers between 1 and 10. Make comments concise but meaningful.`;

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Sound Facts Backend Running",
    version: "1.0.0",
    endpoints: {
      health: "GET /health",
      soundFacts: "POST /api/sound-facts"
    }
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Main Sound Facts endpoint
app.post("/api/sound-facts", async (req, res) => {
  console.log("Received request:", req.body);

  try {
    const { song, artist } = req.body;

    if (!song || !artist) {
      return res.status(400).json({
        error: true,
        message: "Missing required fields: song and artist"
      });
    }

    console.log(`Analyzing: ${song} by ${artist}`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: SOUND_FACTS_PROMPT
        },
        {
          role: "user",
          content: `Analyze this song and return ONLY valid JSON with no markdown formatting.
Song: ${song}
Artist: ${artist}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const text = response.choices[0].message.content;
    console.log("OpenAI response:", text);

    try {
      // Extract JSON if wrapped in markdown code blocks
      let jsonText = text;
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const json = JSON.parse(jsonText);

      // Validate required fields
      if (!json.song || !json.artist) {
        return res.status(200).json({
          error: true,
          message: "Invalid response structure from AI model"
        });
      }

      return res.status(200).json(json);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return res.status(200).json({
        error: true,
        message: "Model returned invalid JSON",
        raw: text,
        parseError: parseError.message
      });
    }
  } catch (error) {
    console.error("Sound Facts backend error:", error);
    return res.status(500).json({
      error: true,
      message: "Sound Facts backend error",
      details: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: true,
    message: "Endpoint not found",
    path: req.path,
    method: req.method,
    availableEndpoints: ["GET /", "GET /health", "POST /api/sound-facts"]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: true,
    message: "Internal server error",
    details: err.message
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📝 Test with: curl -X POST http://localhost:${PORT}/api/sound-facts -H "Content-Type: application/json" -d '{"song":"Bohemian Rhapsody","artist":"Queen"}'`);
});