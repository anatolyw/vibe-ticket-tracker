import { APIRequestContext } from 'playwright';

function getTestPort(): number {
  return (globalThis as Record<string, unknown>).__E2E_PORT as number ?? 61001;
}

const BASE_URL = `http://localhost:${getTestPort()}`;

// ---- REST helpers ----

/**
 * Send a REST API request and return the parsed JSON response.
 */
export async function restRequest(
  request: APIRequestContext,
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; data: unknown }> {
  const res = await request.fetch(`${BASE_URL}${path}`, {
    method,
    data: body,
    maxRetries: 0,
  });
  let data: unknown;
  const contentType = res.headers()['content-type'] || '';
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => ({}));
  } else {
    data = await res.text().catch(() => '');
  }
  return { status: res.status(), data };
}

// ---- MCP helpers ----

/**
 * Initialize the MCP connection and return the session info.
 * Returns a unique request ID for subsequent calls.
 */
export async function mcpInitialize(request: APIRequestContext): Promise<string> {
  const reqId = 'init-' + Date.now();
  const res = await request.post(`${BASE_URL}/mcp`, {
    data: {
      jsonrpc: '2.0',
      id: reqId,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {},
        },
        clientInfo: { name: 'vibe-ticket-tracker-e2e', version: '0.1.0' },
      },
    },
  });
  if (!res.ok()) {
    throw new Error(`MCP initialize failed: ${res.status()}`);
  }
  const body = (await res.json()) as { result?: Record<string, unknown> };
  if (body.error) {
    throw new Error(`MCP initialize error: ${body.error.message}`);
  }
  return reqId;
}

/**
 * Get the list of available MCP tools.
 */
export async function mcpListTools(request: APIRequestContext): Promise<unknown> {
  const res = await request.post(`${BASE_URL}/mcp`, {
    data: {
      jsonrpc: '2.0',
      id: 'list-tools-' + Date.now(),
      method: 'tools/list',
    },
  });
  if (!res.ok()) {
    throw new Error(`MCP tools/list failed: ${res.status()}`);
  }
  const body = (await res.json()) as { result?: unknown; error?: { code: number; message: string } };
  if (body.error) throw new Error(`MCP tools/list error: ${body.error.message}`);
  return body.result;
}

/**
 * Call an MCP tool by name with the given arguments.
 */
export async function mcpCallTool(
  request: APIRequestContext,
  toolName: string,
  args?: Record<string, unknown>,
): Promise<{ result: unknown; error?: { code: number; message: string } }> {
  const reqId = 'call-' + Date.now();
  const res = await request.post(`${BASE_URL}/mcp`, {
    data: {
      jsonrpc: '2.0',
      id: reqId,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args ?? {},
      },
    },
  });
  const body = (await res.json()) as { result?: unknown; error?: { code: number; message: string } };
  return body;
}

/**
 * Read an MCP resource by URI.
 */
export async function mcpReadResource(
  request: APIRequestContext,
  uri: string,
): Promise<{ result: unknown; error?: { code: number; message: string } }> {
  const reqId = 'read-' + Date.now();
  const res = await request.post(`${BASE_URL}/mcp`, {
    data: {
      jsonrpc: '2.0',
      id: reqId,
      method: 'resources/read',
      params: {
        uri,
      },
    },
  });
  const body = (await res.json()) as { result?: unknown; error?: { code: number; message: string } };
  return body;
}

/**
 * Get the list of MCP resource templates.
 */
export async function mcpListResourceTemplates(request: APIRequestContext): Promise<unknown> {
  const res = await request.post(`${BASE_URL}/mcp`, {
    data: {
      jsonrpc: '2.0',
      id: 'list-res-tpl-' + Date.now(),
      method: 'resources/templates/list',
    },
  });
  if (!res.ok()) {
    throw new Error(`MCP resources/templates/list failed: ${res.status()}`);
  }
  const body = (await res.json()) as { result?: unknown; error?: { code: number; message: string } };
  if (body.error) throw new Error(`MCP resources/templates/list error: ${body.error.message}`);
  return body.result;
}

/**
 * Initialize MCP and list tools in one call (for quick tests that don't need tool calling).
 */
export async function mcpQuickInitAndListTools(request: APIRequestContext): Promise<unknown> {
  await mcpInitialize(request);
  return mcpListTools(request);
}

/**
 * Initialize MCP and call a tool in one call.
 */
export async function mcpQuickInitAndCall(
  request: APIRequestContext,
  toolName: string,
  args?: Record<string, unknown>,
): Promise<{ result: unknown; error?: { code: number; message: string } }> {
  await mcpInitialize(request);
  return mcpCallTool(request, toolName, args);
}
