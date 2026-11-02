import { test, expect } from 'playwright/test';

import { createAndCleanup } from './shared/test-helpers.js';
import { mcpInitialize, mcpListResourceTemplates, mcpReadResource } from './shared/make-request.js';

test.describe('Backend E2E — MCP: Resource Templates List', () => {

  test('resources/templates/list returns 5 templates', async ({ request }) => {
    await mcpInitialize(request);
    const res = await request.post('http://localhost:61001/mcp', {
      data: {
        jsonrpc: '2.0',
        id: 'list-tpl-test',
        method: 'resources/templates/list',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    const templates = (body.result as { templates: unknown[] })?.templates;
    expect(Array.isArray(templates)).toBeTruthy();
    expect(templates!.length).toBe(5);
  });

  test('templates include vibe://tickets/{id}', async ({ request }) => {
    await mcpInitialize(request);
    const result = await mcpListResourceTemplates(request);
    const templates = (result as { templates: Array<{ uriTemplate: string }> }).templates;
    const ticketTemplate = templates.find((t: { uriTemplate: string }) => t.uriTemplate === 'vibe://tickets/{id}');
    expect(ticketTemplate).toBeDefined();
  });

  test('vibe://tickets/{id} template has correct mime type', async ({ request }) => {
    await mcpInitialize(request);
    const result = await mcpListResourceTemplates(request);
    const templates = (result as { templates: Array<{ uriTemplate: string; mimeType?: string }> }).templates;
    const template = templates.find((t: { uriTemplate: string }) => t.uriTemplate === 'vibe://tickets/{id}');
    expect(template?.mimeType).toBe('text/markdown');
  });

  test('vibe://tickets/{id}/raw template has correct mime type', async ({ request }) => {
    await mcpInitialize(request);
    const result = await mcpListResourceTemplates(request);
    const templates = (result as { templates: Array<{ uriTemplate: string; mimeType?: string }> }).templates;
    const template = templates.find((t: { uriTemplate: string }) => t.uriTemplate === 'vibe://tickets/{id}/raw');
    expect(template?.mimeType).toBe('text/markdown');
  });

  test('vibe://tickets/{id}/metadata template has correct mime type', async ({ request }) => {
    await mcpInitialize(request);
    const result = await mcpListResourceTemplates(request);
    const templates = (result as { templates: Array<{ uriTemplate: string; mimeType?: string }> }).templates;
    const template = templates.find((t: { uriTemplate: string }) => t.uriTemplate === 'vibe://tickets/{id}/metadata');
    expect(template?.mimeType).toBe('application/json');
  });

  test('vibe://tickets/ template has correct mime type', async ({ request }) => {
    await mcpInitialize(request);
    const result = await mcpListResourceTemplates(request);
    const templates = (result as { templates: Array<{ uriTemplate: string; mimeType?: string }> }).templates;
    const template = templates.find((t: { uriTemplate: string }) => t.uriTemplate === 'vibe://tickets/');
    expect(template?.mimeType).toBe('application/json');
  });

  test('vibe://config template has correct mime type', async ({ request }) => {
    await mcpInitialize(request);
    const result = await mcpListResourceTemplates(request);
    const templates = (result as { templates: Array<{ uriTemplate: string; mimeType?: string }> }).templates;
    const template = templates.find((t: { uriTemplate: string }) => t.uriTemplate === 'vibe://config');
    expect(template?.mimeType).toBe('application/json');
  });

  test('resources/templates/list on invalid request returns error', async ({ request }) => {
    const res = await request.post('http://localhost:61001/mcp', {
      data: {
        method: 'resources/templates/list', // missing jsonrpc
      },
    });
    // MCP handler returns HTTP 400 for invalid requests
    expect(res.status()).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBeDefined();
    expect(body.error?.code).toBe(-32600);
  });
});

test.describe('Backend E2E — MCP: Resource Read', () => {test('resources/read vibe://config returns config', async ({ request }) => {
    await mcpInitialize(request);
    const res = await mcpReadResource(request, 'vibe://config');
    expect(res.result).toBeDefined();
    const result = res.result as Record<string, unknown>;
    const contents = result.contents as Array<Record<string, unknown>>;
    expect(contents.length).toBeGreaterThan(0);
    const config = JSON.parse(contents[0].text as string);
    expect(config).toHaveProperty('VIBE_TRACKER_PORT');
    expect(config).toHaveProperty('VIBE_TRACKER_TICKET_PREFIX');
    expect(config).toHaveProperty('VIBE_TRACKER_TICKET_TYPE_OPTIONS');
  });

  test('resources/read vibe://tickets/ returns ticket index', async ({ request }) => {
    const res = await mcpReadResource(request, 'vibe://tickets/');
    if (res.error) throw new Error(`MCP error: ${res.error.message}`);
    expect(res.result).toBeDefined();
    const result = res.result as Record<string, unknown>;
    const contents = result.contents as Array<Record<string, unknown>>;
    const summaries = JSON.parse(contents[0].text as string);
    expect(Array.isArray(summaries)).toBeTruthy();
  });

  test('resources/read vibe://tickets/{id} returns rendered markdown', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Resource read markdown test');
    try {
      const res = await mcpReadResource(request, `vibe://tickets/${ticket.id}`);
      if (res.error) throw new Error(`MCP error: ${res.error.message}`);
      expect(res.result).toBeDefined();
      const result = res.result as Record<string, unknown>;
      const contents = result.contents as Array<Record<string, unknown>>;
      expect(contents[0].mimeType).toBe('text/markdown');
      // The MCP endpoint returns rendered HTML for the ticket body
      expect(contents[0].text).toContain('<h2>Description</h2>');
    } finally {
      await cleanup();
    }
  });

  test('resources/read vibe://tickets/{id}/raw returns raw markdown', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Resource read raw test');
    try {
      await mcpInitialize(request);
      const res = await mcpReadResource(request, `vibe://tickets/${ticket.id}/raw`);
      expect(res.result).toBeDefined();
      const result = res.result as Record<string, unknown>;
      const contents = result.contents as Array<Record<string, unknown>>;
      expect(contents[0].mimeType).toBe('text/markdown');
      expect(contents[0].text).toContain('## Description');
    } finally {
      await cleanup();
    }
  });

  test('resources/read vibe://tickets/{id}/metadata returns JSON metadata', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Resource read metadata test');
    try {
      await mcpInitialize(request);
      const res = await mcpReadResource(request, `vibe://tickets/${ticket.id}/metadata`);
      expect(res.result).toBeDefined();
      const result = res.result as Record<string, unknown>;
      const contents = result.contents as Array<Record<string, unknown>>;
      expect(contents[0].mimeType).toBe('application/json');
      const metadata = JSON.parse(contents[0].text as string);
      expect(metadata).toHaveProperty('id', ticket.id);
      expect(metadata).toHaveProperty('title');
      expect(metadata).toHaveProperty('type');
      expect(metadata).toHaveProperty('status');
    } finally {
      await cleanup();
    }
  });

  test('resources/read non-existent ticket returns error', async ({ request }) => {
    await mcpInitialize(request);
    const res = await mcpReadResource(request, 'vibe://tickets/issue-99999');
    expect(res.error).toBeDefined();
  });

  test('resources/read unknown resource URI returns error', async ({ request }) => {
    await mcpInitialize(request);
    const res = await mcpReadResource(request, 'vibe://unknown');
    expect(res.error).toBeDefined();
    expect(res.error?.message).toContain('Unknown resource');
  });

  test('resources/read without uri returns error', async ({ request }) => {
    await mcpInitialize(request);
    const res = await request.post('http://localhost:61001/mcp', {
      data: {
        jsonrpc: '2.0',
        id: 'read-no-uri',
        method: 'resources/read',
      },
    });
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBeDefined();
    expect(body.error?.code).toBe(-32602);
    expect(body.error?.message).toContain('uri is required');
  });
});
