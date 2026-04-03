import { randomUUID } from "crypto";
import { db } from "./db";
import { contentSources, topics, concepts, conceptQuestions } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Express } from "express";
import { getMulterConfig, uploadToS3 } from "./storage/s3-storage";
import { load } from "cheerio";
import { createRequire } from "module";
import { readFileSync } from "fs";

// Get multer configuration based on storage type (local or S3)
export const upload = getMulterConfig();

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?#]+)/,
    /youtube\.com\/embed\/([^?]+)/,
    /youtube\.com\/shorts\/([^?]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Fetch transcript from YouTube video
 */
export async function fetchYouTubeTranscript(url: string): Promise<string> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL — could not extract video ID");
  }

  try {
    const { YoutubeTranscript } = await import("youtube-transcript");
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    const text = items.map((item: any) => item.text).join(" ");
    if (text.length < 100) {
      throw new Error("Transcript is too short or unavailable for this video");
    }
    return text
      .replace(/\s+/g, " ")
      .replace(/\[.*?\]/g, "") // remove [Music], [Applause] etc
      .trim();
  } catch (error: any) {
    throw new Error(`Failed to fetch YouTube transcript: ${error.message}`);
  }
}

/**
 * Scrape content from a URL using cheerio (auto-detects YouTube)
 */
export async function scrapeUrlContent(url: string): Promise<string> {
  // Auto-detect YouTube URLs and use transcript instead
  if (extractYouTubeVideoId(url)) {
    return fetchYouTubeTranscript(url);
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    let html = await response.text();
    // Cap HTML size to prevent Cheerio stack overflow on huge pages
    if (html.length > 500_000) html = html.slice(0, 500_000);
    const $ = load(html);

    // Remove script and style elements
    $("script, style, nav, header, footer, aside").remove();

    // Extract text from main content areas (prioritize article, main, or body)
    let content = "";
    const selectors = ["article", "main", "[role='main']", ".content", "#content", "body"];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        content = element.text();
        if (content.length > 500) break; // Found substantial content
      }
    }

    // Fallback to body if no specific content found
    if (content.length < 500) {
      content = $("body").text();
    }

    // Clean up: remove extra whitespace, normalize
    content = content
      .replace(/\s+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (content.length < 100) {
      throw new Error("Insufficient content extracted from URL");
    }

    return content;
  } catch (error: any) {
    throw new Error(`Failed to scrape URL: ${error.message}`);
  }
}

/**
 * Extract text from PDF file using pdf-parse
 */
export async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    const require = createRequire(import.meta.url);
    const pdfParse = require("pdf-parse");
    const dataBuffer = readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    if (!data.text || data.text.length < 50) {
      throw new Error("PDF appears to be empty or contains no extractable text");
    }
    return data.text.replace(/\s+/g, " ").trim();
  } catch (error: any) {
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Register content ingestion routes
 */
export function registerContentIngestionRoutes(app: Express) {
  // PDF upload endpoint
  app.post(
    "/api/admin/sources/upload-pdf",
    upload.single("pdf"),
    async (req: any, res: any) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No PDF file uploaded" });
        }

        const { title, description } = req.body;
        if (!title) {
          return res.status(400).json({ error: "Title is required" });
        }

        const storageType = process.env.STORAGE_TYPE || "local";
        let fileUrl: string | null = null;
        let filePath: string | null = null;

        // Upload to S3 if in production, otherwise use local storage
        if (storageType === "s3") {
          const result = await uploadToS3(req.file, "pdfs");
          fileUrl = result.url;
          filePath = result.key;
        } else {
          filePath = req.file.path;
        }

        // Extract text from PDF (works with both local and S3)
        let extractedText = "";
        try {
          if (storageType === "s3" && req.file.buffer) {
            // For S3, extract from buffer
            // TODO: Implement PDF extraction from buffer
            extractedText = "PDF text extraction from buffer not yet implemented";
          } else {
            extractedText = await extractTextFromPDF(filePath!);
          }
        } catch (extractError: any) {
          console.warn("PDF extraction failed:", extractError.message);
          extractedText = "Extraction failed - install pdf-parse package";
        }

        // Save as content source
        const id = randomUUID();
        await db.insert(contentSources).values({
          id,
          title,
          description: description || `PDF: ${req.file.originalname}`,
          url: fileUrl, // S3 URL or null for local
          isActive: true,
        });

        // Generate lessons from extracted text if OpenAI is configured
        let generatedLessons = null;
        if (process.env.ANTHROPIC_API_KEY && extractedText.length > 100) {
          try {
            const { generateLessonFromContent } = await import("./ai-service");
            generatedLessons = await generateLessonFromContent(extractedText, title);
            res.json({
              success: true,
              id,
              title,
              message: "PDF uploaded and lessons generated successfully",
              fileUrl: fileUrl || filePath,
              extractedLength: extractedText.length,
              generatedConcepts: generatedLessons.concepts.length,
              generatedQuestions: generatedLessons.questions.length,
              lessons: generatedLessons, // Return generated content for admin to review
            });
          } catch (aiError: any) {
            console.error("AI generation error:", aiError);
            res.json({
              success: true,
              id,
              title,
              message: "PDF uploaded but AI generation failed",
              fileUrl: fileUrl || filePath,
              extractedLength: extractedText.length,
              error: aiError.message,
            });
          }
        } else {
          res.json({
            success: true,
            id,
            title,
            message: `PDF uploaded successfully to ${storageType === "s3" ? "S3" : "local storage"}`,
            fileUrl: fileUrl || filePath,
            extractedLength: extractedText.length,
            note: process.env.OPENAI_API_KEY
              ? "Text too short for generation"
              : "Set ANTHROPIC_API_KEY in .env to enable AI lesson generation",
          });
        }
      } catch (error: any) {
        console.error("PDF upload error:", error);
        res.status(500).json({ error: error.message || "Failed to upload PDF" });
      }
    }
  );

  // Website URL ingestion
  app.post("/api/admin/sources/ingest-url", async (req, res) => {
    try {
      const { url, title, description } = req.body;

      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      // Validate URL
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      // Scrape website content
      let scrapedContent = "";
      try {
        scrapedContent = await scrapeUrlContent(url);
      } catch (scrapeError: any) {
        console.warn("URL scraping failed:", scrapeError.message);
        return res.status(400).json({
          error: `Failed to scrape URL: ${scrapeError.message}. Make sure the URL is accessible and contains readable content.`,
        });
      }

      // Save as content source
      const id = randomUUID();
      await db.insert(contentSources).values({
        id,
        title: title || url,
        description: description || `Website: ${url}`,
        url,
        isActive: true,
      });

      res.json({
        success: true,
        id,
        title: title || url,
        url,
        message: "URL added successfully",
        scrapedLength: scrapedContent.length,
        note: scrapedContent.length > 0
          ? "Content scraped. Use 'Quick Create Topic' to generate lessons."
          : "Content scraped but may be minimal.",
      });
    } catch (error: any) {
      console.error("URL ingestion error:", error);
      res.status(500).json({ error: error.message || "Failed to ingest URL" });
    }
  });
}
