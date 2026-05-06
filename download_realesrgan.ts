import { execSync } from 'child_process';

// Try to install Vulkan dependencies if running as root (useful for dev container resets)
try {
  execSync("DEBIAN_FRONTEND=noninteractive apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -yq libvulkan1 mesa-vulkan-drivers", { stdio: 'inherit' });
} catch (e: any) {
  console.log("Could not install Vulkan via apt-get (normal if not root or already installed).");
}

const url = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-ubuntu.zip";
try {
  execSync(`wget -q ${url} -O realesrgan.zip`);
  execSync("unzip -o realesrgan.zip -d realesrgan");
  execSync("chmod +x realesrgan/realesrgan-ncnn-vulkan");
  execSync("rm realesrgan.zip");

  const result = execSync("./realesrgan/realesrgan-ncnn-vulkan -h", { encoding: "utf-8" });
  console.log("Success! Realesrgan works locally.");
  console.log(result.substring(0, 500) + "\n...");
} catch (e: any) {
  console.log("Failed:", e.message);
  if (e.stderr) console.log("STDERR:", e.stderr);
}
