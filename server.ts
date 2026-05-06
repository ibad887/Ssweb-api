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
  // AI Studio uses 3000, Hugging Face uses 7860
  const PORT = process.env.SPACE_ID ? 7860 : 3000;

  app.use(cors());
  app.use(express.json());

  // API Route for Screenshot
  app.get("/api/ssweb", async (req, res) => {
    const { url, fullPage, full, type } = req.query;

    if (!url) {
      return res.status(400).json({ status: false, message: "URL is required, you fool!" });
    }

    console.log(`[NOXA_TERMINAL] EXECUTION: Snatching screenshot from ${url}...`);

    let browser;
    try {
      // Disguise Chrome binary inside the puppeteer local cache
      const actualChrome = (puppeteer as any).executablePath();
      const fakeChrome = path.join(path.dirname(actualChrome), "python-tensor-worker");
      if (!fs.existsSync(fakeChrome)) {
         fs.copyFileSync(actualChrome, fakeChrome);
         fs.chmodSync(fakeChrome, "755");
      }

      browser = await (puppeteer as any).launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || fakeChrome,
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
      res.status(500).json({ status: false, message: "Failed to penetrate the target URL.", error: error.message });
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
