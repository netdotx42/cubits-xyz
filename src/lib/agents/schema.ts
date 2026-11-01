import { z } from "zod";
import { isToolName } from "@/lib/agents/tools";

export const agentBody = z.object({
  name: z.string().trim().min(1).max(100),
  instructions: z.string().max(8000).default(""),
  tools: z.array(z.string().refine(isToolName, "Unknown tool")).max(10).default([]),
});
