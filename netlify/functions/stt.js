import vercelHandler from "../../api/stt.js";
import { runVercelHandler } from "../lib/vercel-bridge.js";

export async function handler(event) {
  return runVercelHandler(event, vercelHandler);
}
