import vercelHandler from "../../api/chat.js";
import { runVercelHandler } from "../lib/vercel-bridge.js";

export async function handler(event) {
  return runVercelHandler(event, vercelHandler);
}
