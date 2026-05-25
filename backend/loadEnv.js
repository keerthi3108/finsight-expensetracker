import dns from "node:dns";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Fix SRV lookup failures on some Windows networks without overriding Vercel DNS.
if (!process.env.VERCEL && process.platform === "win32") {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });
