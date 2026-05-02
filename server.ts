import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// @ts-ignore
puppeteer.use(StealthPlugin());

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Route for Screenshot
  app.get("/api/ssweb", async (req, res) => {
    const { url, fullPage, type } = req.query;

    if (!url) {
      return res.status(400).json({ status: false, message: "URL is required, you fool!" });
    }

    console.log(`[NOXA_TERMINAL] EXECUTION: Snatching screenshot from ${url}...`);

    let browser;
    try {
      browser = await (puppeteer as any).launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: true,
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      
      // Navigate to the target URL
      await page.goto(url as string, { waitUntil: "networkidle2", timeout: 30000 });
      
      const isFullPage = fullPage === "true";

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
  });
}

startServer();
