import type { NextRequest } from "next/server";
import { mcpMethodNotAllowed, mcpPost } from "@/lib/mcp-server";

// Header-auth MCP endpoint (CLI clients that can send custom headers):
//   claude mcp add --transport http career-copilot <origin>/api/mcp \
//     --header "Authorization: Bearer $MCP_TOKEN"

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  return mcpPost(request);
}

export async function GET() {
  return mcpMethodNotAllowed();
}
