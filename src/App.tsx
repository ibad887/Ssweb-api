import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Camera, 
  Layers,
  ChevronRight,
  ExternalLink,
  Code2,
  Scan,
  MonitorSmartphone,
  CheckCircle2
} from "lucide-react";

export default function App() {
  const [url, setUrl] = useState("https://github.com/cakrayp/ssweb-api-caliph");
  const [fullPage, setFullPage] = useState(false);
  const [format, setFormat] = useState("png");
  const [loading, setLoading] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>(["[SYSTEM] API interface ready to capture."]);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${time}] ${msg}`]);
  };

  const handleCapture = async () => {
    if (!url) {
      addLog("ERROR: Target URL is missing.");
      return;
    }

    setLoading(true);
    setScreenshotUrl(null);
    addLog(`Initiating capture: ${url}`);

    try {
      const targetUrl = url.startsWith("http") ? url : `https://${url}`;
      const response = await fetch(`/api/ssweb?url=${encodeURIComponent(targetUrl)}&fullPage=${fullPage}&type=${format}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to capture.");
      }

      const blob = await response.blob();
      const imgUrl = URL.createObjectURL(blob);
      setScreenshotUrl(imgUrl);
      addLog("SUCCESS: Capture complete and ready for download.");
    } catch (err: any) {
      addLog(`CRITICAL FAILURE: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED] font-sans flex flex-col selection:bg-blue-500/30 selection:text-white">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 lg:px-10 border-b border-white/5 bg-[#0D0D0D]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">SSWeb <span className="text-blue-500 underline underline-offset-4 decoration-2">API</span></span>
        </div>
        <nav className="flex gap-8 text-sm font-medium text-gray-400">
          <a href="#" className="hover:text-white transition-colors hidden md:block">Documentation</a>
          <a href="#" className="hover:text-white transition-colors hidden md:block">Endpoints</a>
          <a href="#" className="hover:text-white transition-colors hidden md:block">Pricing</a>
          <a href="#" className="text-white bg-white/10 hover:bg-white/15 px-4 py-1.5 rounded-full border border-white/10 transition-colors">Sign In</a>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 lg:p-10 max-w-[1600px] mx-auto w-full">
        {/* Control Panel */}
        <section className="lg:col-span-6 xl:col-span-5 flex flex-col justify-center gap-8">
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1]">
              High-fidelity <br/><span className="text-blue-500">web captures</span> at scale.
            </h1>
            <p className="text-gray-400 text-base lg:text-lg max-w-lg">
              Render static websites, SPAs, and complex web apps into high-quality images via a simple REST API.
            </p>
          </div>

          <div className="space-y-6">
            <div className="relative group">
              <label className="absolute -top-2.5 left-4 bg-[#0A0A0A] px-2 text-[10px] uppercase tracking-widest text-blue-500 font-bold">
                Website URL
              </label>
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono text-sm"
              />
              <button 
                onClick={handleCapture}
                disabled={loading}
                className="absolute right-3 top-3 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    Capturing
                  </>
                ) : (
                  'Capture'
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider flex items-center gap-1.5"><MonitorSmartphone size={12}/> Viewport</span>
                <select className="w-full bg-transparent text-sm text-gray-300 outline-none cursor-pointer">
                  <option className="bg-[#1a1a1a]">1920x1080 (Desktop)</option>
                  <option className="bg-[#1a1a1a]">390x844 (Mobile)</option>
                </select>
              </div>
              
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider flex items-center gap-1.5"><Layers size={12}/> Format</span>
                <div className="flex gap-4 text-sm mt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white transition-colors">
                    <input 
                      type="radio" 
                      name="format"
                      checked={format === "png"}
                      onChange={() => setFormat("png")}
                      className="accent-blue-500" 
                    /> PNG
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white transition-colors">
                    <input 
                      type="radio" 
                      name="format"
                      checked={format === "jpeg"}
                      onChange={() => setFormat("jpeg")}
                      className="accent-blue-500" 
                    /> JPEG
                  </label>
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider flex items-center gap-1.5"><Scan size={12}/> Options</span>
                <label className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors cursor-pointer mt-1">
                  <input 
                    type="checkbox" 
                    checked={fullPage}
                    onChange={(e) => setFullPage(e.target.checked)}
                    className="accent-blue-500 rounded border-white/20" 
                  /> Full Page
                </label>
              </div>
            </div>
          </div>

          <div className="mt-2 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs text-gray-500 font-mono uppercase tracking-widest">Quick API Reference</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#2563eb]">Log Console →</span>
                </div>
              </div>
              <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-lg font-mono text-[13px] text-blue-300 overflow-x-auto whitespace-nowrap">
                <span className="text-gray-500">GET</span> {window.location.origin}/api/ssweb?url=<span className="text-white italic">{url || "example.com"}</span>&full={fullPage.toString()}&type={format}
              </div>
            </div>
            
            <div className="bg-[#0D0D0D] border border-white/5 rounded-lg p-3 h-32 overflow-y-auto custom-scrollbar font-mono text-[11px] flex flex-col gap-1.5">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-white/20 shrink-0">~</span>
                  <span className={`${log.includes("ERROR") || log.includes("FAILURE") ? "text-red-400" : log.includes("SUCCESS") ? "text-green-400" : "text-gray-400"}`}>
                    {log}
                  </span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </section>

        {/* Preview Window */}
        <section className="lg:col-span-6 xl:col-span-7 flex flex-col justify-center mt-8 lg:mt-0">
          <div className="relative bg-[#171717] rounded-2xl border border-white/10 shadow-2xl overflow-hidden aspect-[4/3] flex flex-col">
            <div className="h-10 bg-[#262626] border-b border-white/10 flex items-center px-4 justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]"></div>
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]"></div>
                <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]"></div>
                <div className="ml-4 bg-[#1A1A1A] h-6 rounded flex items-center px-3 text-[11px] text-gray-500 font-mono w-48 sm:w-64 overflow-hidden text-ellipsis whitespace-nowrap">
                  {url ? url.replace(/^https?:\/\//, '') : "localhost:3000"}
                </div>
              </div>
              {screenshotUrl && (
                <a 
                  href={screenshotUrl} 
                  download={`capture_${Date.now()}.${format}`}
                  className="flex items-center justify-center gap-1.5 text-xs text-white/50 hover:text-blue-500 transition-colors bg-white/5 px-2.5 py-1 rounded-md border border-white/5"
                >
                  <ExternalLink size={12} />
                  Download target
                </a>
              )}
            </div>
            
            <div className="flex-1 bg-[#121212] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden group">
              <AnimatePresence mode="wait">
                {screenshotUrl ? (
                  <motion.div 
                    key="screenshot"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative w-full h-full flex items-center justify-center overflow-auto custom-scrollbar"
                  >
                    <img 
                      src={screenshotUrl} 
                      alt="Captured web page" 
                      className="max-w-full shadow-2xl border border-white/10 rounded"
                    />
                  </motion.div>
                ) : (
                  <motion.div 
                    key="placeholder"
                    className="w-full h-full border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-center space-y-4 bg-[#0A0A0A]/50 relative"
                  >
                    {loading ? (
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/30">
                           <Scan size={32} className="text-blue-500 animate-pulse" />
                        </div>
                        <div className="absolute inset-0 bg-blue-400 blur-2xl opacity-20 animate-pulse rounded-full" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                        <Code2 className="w-8 h-8 text-gray-600" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-400">
                        {loading ? "Processing render..." : "Preview will appear here"}
                      </p>
                      <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-1.5 font-bold">
                        {loading ? "Extracting DOM layers" : "Awaiting first request"}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Status Overlay */}
            <div className="absolute bottom-4 right-4 bg-blue-600/10 backdrop-blur-sm border border-blue-500/20 px-3 py-1.5 rounded flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${loading ? "bg-amber-400 animate-ping" : "bg-blue-500"}`}></span>
              <span className={`text-[10px] font-bold uppercase ${loading ? "text-amber-400" : "text-blue-400"}`}>
                {loading ? "Working" : "Ready"}
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Bar */}
      <footer className="h-10 px-6 lg:px-10 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-widest mt-auto">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-green-500" />
          <span>System Status: <span className="text-green-500 font-medium">All systems operational</span></span>
        </div>
        <div className="flex gap-6">
          <span className="hidden sm:inline">99.9% Uptime</span>
          <span>v2.4.0</span>
        </div>
      </footer>
    </div>
  );
}
