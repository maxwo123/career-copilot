import type { NextRequest } from "next/server";
import { mcpMethodNotAllowed, mcpPost } from "@/lib/mcp-server";

// Token-in-path MCP endpoint for claude.ai / ChatGPT custom connectors,
// which only support authless or OAuth servers (no custom headers). The
// secret URL is the credential: <origin>/api/mcp/<MCP_TOKEN>

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  return mcpPost(request, token);
}

export async function GET() {
  return mcpMethodNotAllowed();
}
