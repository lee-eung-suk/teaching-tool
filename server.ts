import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';

// Lazy initialization for Gemini AI client to prevent startup crashes
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables.");
    }
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Word Processing (Filtration and Synonym normalization)
  app.post('/api/process-word', async (req, res) => {
    try {
      const { word } = req.body;
      if (!word) {
        res.status(400).json({ error: 'Word is required' });
        return;
      }

      const prompt = `You are a strict but friendly content moderator and synonym grouper for a kindergarten/elementary school wordcloud survey tool.
The user submitted the word: "${word}".
Task:
1. Is it a bad word, curse word, explicit, violently themed, harmful, or inappropriate for young children? If yes, set "valid": false and provide a child-friendly short reason in Korean.
2. If it is an acceptable word, normalize it to a standard, simple Korean representative noun (e.g., 'apple', '애플' -> '사과', '아빠', '대디' -> '아빠', '놀기', '놀다' -> '놀기').

Respond ONLY with a raw JSON object and no markdown blocks, like this:
{
  "valid": true or false,
  "word": "normalized word",
  "reason": "If invalid, why (in Korean)? Else empty string."
}`;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const responseText = response.text || '{}';
      const cleanedText = responseText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      const result = JSON.parse(cleanedText);

      res.json(result);
    } catch (e: any) {
      console.error("Gemini Error:", e);
      res.status(500).json({ error: 'Failed to process word.' });
    }
  });

  // Vite Integration for full-stack React routing
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is successfully running on http://localhost:${PORT} (Express)`);
  });
}

startServer();
