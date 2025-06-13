import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { apiKey } = req.body;

  if (!apiKey || typeof apiKey !== "string") {
    res.status(400).json({ error: "API key is required" });
    return;
  }

  try {
    // Basic validation
    if (!apiKey.trim() || !apiKey.startsWith("gsk_")) {
      res.status(400).json({ error: "Invalid Groq API key format. It should start with 'gsk_'" });
      return;
    }

    // Validate the API key by making a test call to Groq
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        res.status(401).json({ error: "Invalid API key. Please check your Groq API key and try again." });
        return;
      } else {
        res.status(500).json({ error: `API validation failed: ${response.status} ${response.statusText}` });
        return;
      }
    }

    res.status(200).json({ valid: true });
  } catch (error) {
    console.error("Error validating API key:", error);
    res.status(500).json({ error: "Internal server error during validation" });
  }
} 