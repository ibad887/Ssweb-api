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

      // Take screenshot
      const screenshot = await page.screenshot({
        fullPage: fullPage === "true",
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
