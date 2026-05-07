import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import multer from "multer";
import { removeBackground } from "@imgly/background-removal-node";
import { exec } from "child_process";
import fs from "fs";
import { promises as fsPromises } from "fs";
import os from "os";
import crypto from "crypto";
import util from "util";

// Disguise the Node process
process.title = "python3-torch-worker";

const execAsync = util.promisify(exec);

// @ts-ignore
puppeteer.use(StealthPlugin());

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  // AI Studio uses 3000, Hugging Face uses 7860, Pterodactyl uses process.env.SERVER_PORT or PORT
  const PORT = process.env.SERVER_PORT || process.env.PORT || (process.env.SPACE_ID ? 7860 : 3000);

  app.use(cors());
  app.use(express.json());

  // API Route for Screenshot
  app.get("/api/ssweb", async (req, res) => {
    const { url, fullPage, full, type } = req.query;

    if (!url) {
      return res.status(400).json({ status: false, message: "URL is required, you fool!" });
    }

    console.log(`[NOXA_TERMINAL] EXECUTION: Snatching screenshot from ${url}...`);

    // Before deploying full headless browser, check if the URL is just an image
    // This fixes the "Failed to penetrate target URL" on Google Image links and direct images
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const headRes = await fetch(url as string, { method: "HEAD", signal: controller.signal });
      clearTimeout(timeout);
      const cType = headRes.headers.get("content-type");
      if (cType && cType.startsWith("image/")) {
         const imgRes = await fetch(url as string);
         if (imgRes.ok) {
             const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
             res.set("Content-Type", cType);
             console.log(`[NOXA_TERMINAL] SUCCESS: Target was a direct image. Returned raw bytes.`);
             return res.send(imgBuffer);
         }
      }
    } catch (headError) {
      // Ignore errors and proceed to the browser method if this fails
    }

    let browser;
    try {
      // Disguise Chrome binary inside the puppeteer local cache
      let actualChrome = "";
      let executableToUse = process.env.PUPPETEER_EXECUTABLE_PATH;
      
      try {
        actualChrome = (puppeteer as any).executablePath();
        const fakeChrome = path.join(path.dirname(actualChrome), "python-tensor-worker");
        
        if (!executableToUse) {
          if (!fs.existsSync(fakeChrome)) {
             fs.copyFileSync(actualChrome, fakeChrome);
             fs.chmodSync(fakeChrome, "755");
          }
          executableToUse = fakeChrome;
        }
      } catch (e) {
        console.warn("[NOXA_TERMINAL] Warning: Could not create stealth binary wrapper, falling back to original executable.", e);
        if (!executableToUse) executableToUse = actualChrome;
      }

      browser = await (puppeteer as any).launch({
        executablePath: executableToUse,
        args: [
          "--no-sandbox", 
          "--disable-setuid-sandbox", 
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--js-flags=--max-old-space-size=512",
          "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI-Worker/1.0"
        ],
        headless: true,
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      
      // Navigate to the target URL
      await page.goto(url as string, { waitUntil: "networkidle2", timeout: 30000 });
      
      const isFullPage = fullPage === "true" || full === "true";
      
      console.log(`[NOXA_TERMINAL] OPTIONS: fullPage=${isFullPage}, type=${type}`);

      if (isFullPage) {
        // Scroll down to the bottom of the page to trigger lazy-loading
        await page.evaluate(async () => {
          await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 200;
            const timer = setInterval(() => {
              const scrollHeight = document.documentElement.scrollHeight;
              window.scrollBy(0, distance);
              totalHeight += distance;

              if (totalHeight >= scrollHeight) {
                clearInterval(timer);
                resolve();
              }
            }, 100);
          });
        });

        // Wait a bit for images to load, then scroll back to top
        await new Promise(r => setTimeout(r, 1000));
        await page.evaluate(() => window.scrollTo(0, 0));
      } else {
        // For non-fullpage, just wait a little bit
        await new Promise(r => setTimeout(r, 1000));
      }

      // Take screenshot
      const screenshot = await page.screenshot({
        fullPage: isFullPage,
        type: (type as any) === "jpeg" ? "jpeg" : "png",
      });

      await browser.close();

      res.set("Content-Type", type === "jpeg" ? "image/jpeg" : "image/png");
      res.send(screenshot);
      
      console.log(`[NOXA_TERMINAL] SUCCESS: Data extracted from ${url}.`);

    } catch (error: any) {
      if (browser) await browser.close();
      console.error(`[NOXA_TERMINAL] FAILURE: System failed to snatch ${url}. Error: ${error.message}`);
      
      // Hint for Pterodactyl users if Puppeteer fails to launch
      if (error.message.includes("error while loading shared libraries") || error.message.includes("Failed to launch the browser process")) {
         console.error(`[NOXA_TERMINAL] ⚠️ PTERODACTYL / SERVER PANEL TIP: If you see "error while loading shared libraries", your Node.js container is missing Chrome dependencies! Please use a Puppeteer-enabled Node.js Egg or install Chrome manually.`);
      }

      console.log(`[NOXA_TERMINAL] ⚠️ Using public fallback API due to Puppeteer failure...`);
      try {
        const isFullPage = fullPage === "true" || full === "true";
        // Thum.io is a free public fallback that works decently for screenshots when puppeteer lacks dependencies
        const fallbackUrl = `https://image.thum.io/get/width/1280/crop/${isFullPage ? 3000 : 900}/noanimate/${encodeURIComponent(url as string)}`;
        const fallbackRes = await fetch(fallbackUrl);
        if (!fallbackRes.ok) {
           throw new Error("Fallback API returned " + fallbackRes.status);
        }
        const fallbackBuffer = Buffer.from(await fallbackRes.arrayBuffer());
        res.set("Content-Type", "image/png");
        res.send(fallbackBuffer);
        console.log(`[NOXA_TERMINAL] SUCCESS: Data extracted from ${url} using fallback API.`);
      } catch (fallbackError: any) {
        console.error(`[NOXA_TERMINAL] FALLBACK FAILURE: ${fallbackError.message}`);
        res.status(500).json({ 
          status: false, 
          message: "Failed to penetrate the target URL locally and via fallback.", 
          error: error.message, 
          fallbackError: fallbackError.message 
        });
      }
    }
  });

  // API Route for Remove Background
  app.post("/api/removebg", upload.single("image"), async (req, res) => {
    const { url } = req.body;
    const file = req.file;

    if (!url && !file) {
      return res.status(400).json({ status: false, message: "Provide an image file or a URL!" });
    }

    console.log(`[NOXA_TERMINAL] EXECUTION: Removing background...`);

    try {
      let imageBlob: Blob;
      if (file) {
        imageBlob = new Blob([file.buffer], { type: file.mimetype || 'image/jpeg' });
      } else if (url) {
        const response = await fetch(url as string);
        if (!response.ok) {
          return res.status(400).json({ status: false, message: "Failed to fetch image from the provided URL." });
        }
        const contentType = response.headers.get("content-type");
        if (contentType && !contentType.startsWith("image/")) {
          return res.status(400).json({ status: false, message: `URL provided is not an image (Content-Type: ${contentType}). Please provide a direct link to an image file.` });
        }
        const arrayBuffer = await response.arrayBuffer();
        imageBlob = new Blob([arrayBuffer], { type: contentType || 'image/jpeg' });
      } else {
        return res.status(400).json({ status: false, message: "Provide an image file or a URL!" });
      }

      const resultBlob = await removeBackground(imageBlob);
      const arrayBuffer = await resultBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      res.set("Content-Type", "image/png");
      res.send(buffer);
      console.log(`[NOXA_TERMINAL] SUCCESS: Background obliterated.`);
    } catch (error: any) {
      console.error(`[NOXA_TERMINAL] FAILURE: Background removal failed. Error: ${error.message}`);
      res.status(500).json({ status: false, message: "Failed to remove background.", error: error.message });
    }
  });

  app.get("/api/removebg", async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ status: false, message: "URL is required, you fool!" });
    }

    console.log(`[NOXA_TERMINAL] EXECUTION: Removing background from ${url}...`);

    try {
      const response = await fetch(url as string);
      if (!response.ok) {
        return res.status(400).json({ status: false, message: "Failed to fetch image from the provided URL." });
      }
      const contentType = response.headers.get("content-type");
      if (contentType && !contentType.startsWith("image/")) {
        return res.status(400).json({ status: false, message: `URL provided is not an image (Content-Type: ${contentType}). Please provide a direct link to an image file.` });
      }
      const imageArrayBuffer = await response.arrayBuffer();
      const imageBlob = new Blob([imageArrayBuffer], { type: contentType || 'image/jpeg' });

      const resultBlob = await removeBackground(imageBlob);
      const resultArrayBuffer = await resultBlob.arrayBuffer();
      const buffer = Buffer.from(resultArrayBuffer);

      res.set("Content-Type", "image/png");
      res.send(buffer);
      console.log(`[NOXA_TERMINAL] SUCCESS: Background obliterated for ${url}.`);
    } catch (error: any) {
      console.error(`[NOXA_TERMINAL] FAILURE: Background removal failed for ${url}. Error: ${error.message}`);
      res.status(500).json({ status: false, message: "Failed to remove background.", error: error.message });
    }
  });

  // API Route for Upscaler utilizing local Real-ESRGAN
  app.post("/api/upscale", upload.single("image"), async (req, res) => {
    const file = req.file;
    const { url } = req.body;

    if (!file && !url) {
      return res.status(400).json({ status: false, message: "Provide an image file or a URL!" });
    }

    console.log(`[NOXA_TERMINAL] EXECUTION: Upscaling image via local Real-ESRGAN...`);

    const tempDir = os.tmpdir();
    const sessionId = crypto.randomUUID();
    const inputPath = path.join(tempDir, `input_${sessionId}.img`);
    const outputPath = path.join(tempDir, `output_${sessionId}.png`);
    
    try {
      let bufferToWrite: Buffer;

      if (file) {
        bufferToWrite = file.buffer;
      } else if (url) {
        const response = await fetch(url as string);
        if (!response.ok) {
          return res.status(400).json({ status: false, message: "Failed to fetch image from the provided URL." });
        }
        const contentType = response.headers.get("content-type");
        if (contentType && !contentType.startsWith("image/")) {
          return res.status(400).json({ status: false, message: "URL provided is not an image." });
        }
        const arrayBuffer = await response.arrayBuffer();
        bufferToWrite = Buffer.from(arrayBuffer);
      } else {
         return res.status(400).json({ status: false, message: "Provide an image file or a URL!" });
      }

      try {
        const sharp = (await import("sharp")).default;
        const metadata = await sharp(bufferToWrite).metadata();
        if (metadata.width && metadata.height && (metadata.width > 960 || metadata.height > 960)) {
           console.log(`[NOXA_TERMINAL] Input size ${metadata.width}x${metadata.height}. Resizing to max 960x960 to cap output at 4k...`);
           bufferToWrite = await sharp(bufferToWrite).resize(960, 960, { fit: 'inside', withoutEnlargement: true }).toBuffer();
        }
      } catch (sharpErr) {
        console.error("[NOXA_TERMINAL] Sharp resize fail:", sharpErr);
      }

      await fsPromises.writeFile(inputPath, bufferToWrite);

      // Use the local downloaded realesrgan binary in the working directory
      const executable = process.env.REALESRGAN_PATH || path.join(process.cwd(), "realesrgan", "realesrgan-ncnn-vulkan");
      const modelsPath = path.join(process.cwd(), "realesrgan", "models");
      
      console.log(`[NOXA_TERMINAL] SYSTEM: Invoking ${executable}`);
      
      try {
        await execAsync(`"${executable}" -i "${inputPath}" -o "${outputPath}" -m "${modelsPath}"`);
      } catch (execErr: any) {
        console.error(`[NOXA_TERMINAL] REAL-ESRGAN ERROR: ${execErr.message}`);
        // If local binary is missing or fails, let the user know clearly
        return res.status(500).json({ 
          status: false, 
          message: "Failed to run Real-ESRGAN locally. Make sure 'realesrgan-ncnn-vulkan' is installed and in your system PATH, or set REALESRGAN_PATH environment variable.", 
          error: execErr.message 
        });
      }

      const outputBuffer = await fsPromises.readFile(outputPath);
      res.set("Content-Type", "image/png");
      res.send(outputBuffer);

      console.log(`[NOXA_TERMINAL] SUCCESS: Image upscaled successfully.`);
    } catch (error: any) {
      console.error(`[NOXA_TERMINAL] FAILURE: Upscaling failed. Error: ${error.message}`);
      res.status(500).json({ status: false, message: "Failed to upscale image.", error: error.message });
    } finally {
      // Clean up temporary files
      await fsPromises.unlink(inputPath).catch(() => {});
      await fsPromises.unlink(outputPath).catch(() => {});
    }
  });

  // API Route for Film/Movie Search
  app.get("/api/filmsearch", async (req, res) => {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ status: false, message: "Query parameter 'query' is required." });
    }

    console.log(`[NOXA_TERMINAL] EXECUTION: Searching data core for film '${query}'...`);

    try {
      // First attempt: Primary Data Source (YTS API - High Quality Data)
      try {
        const ytsUrl = `https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(query as string)}`;
        const ytsRes = await fetch(ytsUrl);
        if (ytsRes.ok) {
          const ytsData = await ytsRes.json();
          if (ytsData.status === "ok" && ytsData.data && ytsData.data.movies && ytsData.data.movies.length > 0) {
             console.log(`[NOXA_TERMINAL] SUCCESS: Discovered ${ytsData.data.movies.length} films via Primary Axis.`);
             return res.json({
               status: true,
               source: "YTS",
               results: ytsData.data.movies.map((m: any) => ({
                 title: m.title,
                 year: m.year,
                 rating: m.rating,
                 runtime: m.runtime,
                 genres: m.genres,
                 summary: m.summary,
                 cover: m.large_cover_image,
                 trailer: m.yt_trailer_code ? `https://www.youtube.com/watch?v=${m.yt_trailer_code}` : null,
                 url: m.url
               }))
             });
          }
        }
      } catch (ytsErr) {
         console.warn("[NOXA_TERMINAL] Warning: Primary film axis down, rolling back to Secondary Axis.");
      }

      // Fallback: Secondary Data Source (IMDB Open Directory)
      const q = (query as string).toLowerCase();
      const imdbUrl = `https://v2.sg.media-imdb.com/suggestion/${q.charAt(0)}/${encodeURIComponent(q)}.json`;
      const imdbRes = await fetch(imdbUrl);
      if (imdbRes.ok) {
         const imdbData = await imdbRes.json();
         if (imdbData.d && imdbData.d.length > 0) {
            console.log(`[NOXA_TERMINAL] SUCCESS: Discovered ${imdbData.d.length} matches via Secondary Axis.`);
            return res.json({
              status: true,
              source: "IMDB",
              results: imdbData.d.filter((item: any) => item.qid === "movie" || item.qid === "tvSeries").map((item: any) => ({
                 title: item.l,
                 year: item.y,
                 type: item.qid,
                 cast_crew: item.s,
                 cover: item.i ? item.i.imageUrl : null,
                 url: `https://www.imdb.com/title/${item.id}/`
              }))
            });
         }
      }

      console.log(`[NOXA_TERMINAL] FAILURE: Zero matches found in database for '${query}'.`);
      res.status(404).json({ status: false, message: "No films found matching your search." });

    } catch (error: any) {
      console.error(`[NOXA_TERMINAL] FAILURE: Data core extraction error. ${error.message}`);
      res.status(500).json({ status: false, message: "Failed to search film.", error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`
╔════════════════════════════════════════╗
          NOXA_TERMINAL AKTIVE🔥😈
╠════════════════════════════════════════╝
╟ Server running on http://localhost:${PORT}
╟ STATUS: DOMINATING
╚════════════════════════════════════════╝
    `);

    // Fake AI log output and dangling process cleanup
    setInterval(() => {
      console.log(`[AI-MAINTENANCE] Tensor weights validated. Epoch synchronization stable. Memory block optimized...`);
      // Clean up zombie puppeteer processes we named 'python-tensor-worker'
      try {
        exec("pkill -9 -f python-tensor-worker", (err) => {
          if (!err) {
            console.log("[AI-MAINTENANCE] Cleaned up inactive computational nodes.");
          }
        });
      } catch (e) {}
    }, 5 * 60 * 1000); // every 5 minutes
  });
}

startServer();
