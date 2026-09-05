import handler from "../../api/image.js";
import { runVercelHandler } from "../lib/vercel-bridge.js";

export async function handler(event) {
  return runVercelHandler(
    event,
    handler
  );
}
