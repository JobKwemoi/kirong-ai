import vercelHandler from "../../api/tts.js";
import { runVercelHandler } from "../lib/vercel-bridge.js";

export async function handler(event) {
  return runVercelHandler(event, vercelHandler);
}
