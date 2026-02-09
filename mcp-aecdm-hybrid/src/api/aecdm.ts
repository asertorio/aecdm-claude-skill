/**
 * AECDM API Client
 * 
 * This module provides type-safe wrappers around MCP tool calls for fetching
 * AECDM data. All actual GraphQL queries are executed on the server side.
 */

import type { App } from "@modelcontextprotocol/ext-apps";
import type {
  Hub,
  Project,
  ElementGroup,
  Element,
  Property,
} from "../types";

// ============================================================================
// Types
// ============================================================================

export interface APIWarning {
  message: string;
  correlationId?: string;
}

export interface APIError {
  error: string;
  correlationId?: string;
}

// ============================================================================
// Response Parsing Helpers
// ============================================================================

function parseToolResult<T>(result: { content: Array<{ type: string; text?: string }> }): T {
  const textContent = result.content.find((c) => c.type === "text");
  if (!textContent || !textContent.text) {
    throw new Error("No text content in tool result");
  }
  return JSON.parse(textContent.text);
}

// Helper to log warnings if present in response
function logWarningsIfPresent(data: { _warnings?: APIWarning[] }, context: string): void {
  if (data._warnings && data._warnings.length > 0) {
    console.warn(`[AECDM API] Partial response for ${context} with warnings:`);
    data._warnings.forEach((w, i) => {
      console.warn(`  [${i + 1}] ${w.message}${w.correlationId ? ` (Correlation ID: ${w.correlationId})` : ""}`);
    });
  }
}

// ============================================================================
// Authentication
// ============================================================================

export async function checkAuth(app: App): Promise<boolean> {
  const result = await app.callServerTool({ name: "check-auth", arguments: {} });
  const data = parseToolResult<{ authenticated: boolean }>(result);
  return data.authenticated;
}

export async function authenticate(app: App): Promise<{ authenticated: boolean; error?: string }> {
  const result = await app.callServerTool({ name: "authenticate", arguments: {} });
  return parseToolResult<{ authenticated: boolean; error?: string }>(result);
}

// ============================================================================
// Hub / Project / ElementGroup Fetching
// ============================================================================

export async function getHubs(app: App): Promise<Hub[]> {
  const result = await app.callServerTool({ name: "get-hubs", arguments: {} });
  const data = parseToolResult<{
    hubs?: { results: Hub[] };
    error?: string;
    correlationId?: string;
    _warnings?: APIWarning[];
  }>(result);
  
  if (data.error) {
    const errorMsg = data.correlationId
      ? `${data.error} (Correlation ID: ${data.correlationId})`
      : data.error;
    throw new Error(errorMsg);
  }
  
  logWarningsIfPresent(data, "getHubs");
  
  return data.hubs?.results ?? [];
}

export async function getProjects(app: App, hubId: string): Promise<Project[]> {
  const result = await app.callServerTool({
    name: "get-projects",
    arguments: { hubId },
  });
  const data = parseToolResult<{
    projects?: { results: Project[] };
    error?: string;
    correlationId?: string;
    _warnings?: APIWarning[];
  }>(result);
  
  if (data.error) {
    const errorMsg = data.correlationId
      ? `${data.error} (Correlation ID: ${data.correlationId})`
      : data.error;
    throw new Error(errorMsg);
  }
  
  logWarningsIfPresent(data, "getProjects");
  
  return data.projects?.results ?? [];
}

export async function getElementGroups(app: App, projectId: string): Promise<ElementGroup[]> {
  const result = await app.callServerTool({
    name: "get-element-groups",
    arguments: { projectId },
  });
  const data = parseToolResult<{
    elementGroupsByProject?: {
      results: Array<{
        id: string;
        name: string;
        alternativeIdentifiers: { fileVersionUrn: string };
      }>;
    };
    error?: string;
    correlationId?: string;
    _warnings?: APIWarning[];
  }>(result);
  
  if (data.error) {
    const errorMsg = data.correlationId
      ? `${data.error} (Correlation ID: ${data.correlationId})`
      : data.error;
    throw new Error(errorMsg);
  }
  
  logWarningsIfPresent(data, "getElementGroups");
  
  // Transform to ElementGroup type
  return (data.elementGroupsByProject?.results ?? []).map((eg) => ({
    id: eg.id,
    name: eg.name,
    fileVersionUrn: eg.alternativeIdentifiers?.fileVersionUrn ?? "",
  }));
}

export async function getElementsByCategory(
  app: App,
  elementGroupId: string,
  category: string
): Promise<Element[]> {
  const result = await app.callServerTool({
    name: "get-elements-by-category",
    arguments: { elementGroupId, category },
  });
  const data = parseToolResult<{
    elementsByElementGroup?: {
      results: Array<{
        id: string;
        name: string;
        properties: { results: Property[] };
      }>;
    };
    error?: string;
    correlationId?: string;
    _warnings?: APIWarning[];
  }>(result);
  
  if (data.error) {
    const errorMsg = data.correlationId
      ? `${data.error} (Correlation ID: ${data.correlationId})`
      : data.error;
    throw new Error(errorMsg);
  }
  
  logWarningsIfPresent(data, "getElementsByCategory");
  
  // Transform to Element type
  return (data.elementsByElementGroup?.results ?? []).map((el) => ({
    id: el.id,
    name: el.name,
    properties: el.properties?.results ?? [],
  }));
}

// ============================================================================
// Custom Query Execution
// ============================================================================

export interface ExecuteQueryResult<T = unknown> {
  data?: T;
  errors?: Array<{ message: string; correlationId?: string }>;
  hasPartialData: boolean;
}

export async function executeQuery<T = unknown>(
  app: App,
  query: string,
  variables?: Record<string, unknown>,
  region?: string
): Promise<ExecuteQueryResult<T>> {
  const result = await app.callServerTool({
    name: "execute-query",
    arguments: {
      query,
      variables: variables ? JSON.stringify(variables) : undefined,
      region,
    },
  });
  const data = parseToolResult<{
    data?: T;
    errors?: Array<{ message: string; correlationId?: string }>;
  }>(result);
  
  // Log errors but don't throw - let caller decide how to handle partial data
  if (data.errors && data.errors.length > 0) {
    console.warn("[AECDM API] executeQuery returned errors:");
    data.errors.forEach((e, i) => {
      console.warn(`  [${i + 1}] ${e.message}${e.correlationId ? ` (Correlation ID: ${e.correlationId})` : ""}`);
    });
  }
  
  return {
    data: data.data,
    errors: data.errors,
    hasPartialData: !!(data.data && data.errors && data.errors.length > 0),
  };
}

// ============================================================================
// Available Categories
// ============================================================================

export const ELEMENT_CATEGORIES = [
  "Walls",
  "Windows",
  "Floors",
  "Doors",
  "Furniture",
  "Ceilings",
  "Electrical Equipment",
] as const;

export type ElementCategory = typeof ELEMENT_CATEGORIES[number];
