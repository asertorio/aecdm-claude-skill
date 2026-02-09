// MCP AECDM Hybrid Server (stdio transport)
//
// This server is auto-launched by Cursor via .cursor/mcp.json — no manual
// "serve" step is needed. Cursor spawns `node build/server.js` and
// communicates over stdio, the same pattern as mcp-aecdm-configurable (.NET).
//
// For local development, use `npm run dev` (tsx server.ts).
//
// NOTE: All logging MUST go to stderr (console.error) because stdout is
// reserved for JSON-RPC communication with the host.

import "dotenv/config";
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import open from "open";
import { z } from "zod";
import { WebSocketServer, WebSocket } from "ws";

// ============================================================================
// Type Definitions
// ============================================================================

interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

interface GraphQLError {
  message: string;
  extensions?: {
    correlationId?: string;
    code?: string;
    [key: string]: unknown;
  };
  path?: string[];
  locations?: Array<{ line: number; column: number }>;
}

interface GraphQLResponse {
  data?: unknown;
  errors?: GraphQLError[];
}

// Result type that includes both data and errors for partial responses
interface GraphQLResult {
  data: unknown;
  errors?: GraphQLError[];
  hasErrors: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

const CLIENT_ID = process.env.CLIENT_ID;
const CALLBACK_URL = "http://localhost:5001/";
const SCOPES = "data:read viewables:read";
const AECDM_URL = "https://developer.api.autodesk.com/aec/graphql";

const VIEWER_HTTP_PORT = 8080;
const VIEWER_WS_PORT = 8081;

if (!CLIENT_ID) {
  console.error("ERROR: CLIENT_ID environment variable is required");
  process.exit(1);
}

// ============================================================================
// Server State
// ============================================================================

let accessToken: string | null = null;
let refreshToken: string | null = null;
let codeVerifier: string | null = null;

// Current model context (tracked so Claude can reuse the elementGroupId)
let currentElementGroupId: string | null = null;
let currentElementGroupName: string | null = null;
let currentFileVersionUrn: string | null = null;

// External viewer state
let viewerHttpServer: http.Server | null = null;
let viewerWsServer: WebSocketServer | null = null;
let wsConnection: WebSocket | null = null;
let viewerServerRunning = false;
let pendingMessage: string | null = null;

// ============================================================================
// Viewer HTML Template
// ============================================================================

const VIEWER_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Autodesk Viewer - MCP Hybrid</title>
  <link rel="stylesheet"
        href="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css"
        type="text/css">
  <script src="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #apsViewer { width: 100%; height: 100%; }
    #status {
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 24px;
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 10000;
      transition: opacity 0.3s;
    }
    #status.hidden { opacity: 0; pointer-events: none; }
  </style>
</head>
<body>
  <div id="apsViewer"></div>
  <div id="status">Waiting for model selection...</div>

  <script>
    let viewer = null;
    let socket = null;
    const statusEl = document.getElementById('status');

    function showStatus(msg) {
      statusEl.textContent = msg;
      statusEl.classList.remove('hidden');
    }

    function hideStatus() {
      statusEl.classList.add('hidden');
    }

    function connectWebSocket() {
      socket = new WebSocket('ws://localhost:${VIEWER_WS_PORT}');

      socket.onopen = function() {
        console.log('WebSocket connected');
      };

      socket.onmessage = function(event) {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'load-model') {
            loadModel(msg.urn, msg.accessToken);
          } else if (msg.type === 'highlight') {
            highlightElements(msg.externalIds);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      socket.onclose = function() {
        console.log('WebSocket disconnected, reconnecting in 2s...');
        setTimeout(connectWebSocket, 2000);
      };

      socket.onerror = function(err) {
        console.error('WebSocket error:', err);
        socket.close();
      };
    }

    function loadModel(urn, accessToken) {
      showStatus('Loading model...');

      // Tear down existing viewer if present
      if (viewer) {
        viewer.finish();
        viewer = null;
      }

      const options = {
        env: 'AutodeskProduction',
        accessToken: accessToken,
        isAEC: true
      };

      Autodesk.Viewing.Initializer(options, function() {
        const div = document.getElementById('apsViewer');
        const config = { extensions: ['Autodesk.DocumentBrowser'] };
        viewer = new Autodesk.Viewing.Private.GuiViewer3D(div, config);
        viewer.start();
        viewer.setTheme('light-theme');

        Autodesk.Viewing.Document.load('urn:' + urn, function(doc) {
          var viewables = doc.getRoot().getDefaultGeometry();
          viewer.loadDocumentNode(doc, viewables).then(function() {
            showStatus('Model loaded');
            setTimeout(hideStatus, 2000);
          });
        }, function(errCode) {
          showStatus('Failed to load model (error ' + errCode + ')');
        });
      });
    }

    function highlightElements(externalIds) {
      if (!viewer || !viewer.model) {
        console.warn('Viewer not ready for highlighting');
        return;
      }

      viewer.model.getExternalIdMapping(function(mapping) {
        var dbids = [];
        externalIds.forEach(function(externalId) {
          var dbid = mapping[externalId];
          if (dbid !== undefined) {
            dbids.push(dbid);
          }
        });

        if (dbids.length > 0) {
          viewer.isolate(dbids);
          viewer.fitToView(dbids);
          showStatus(dbids.length + ' element(s) highlighted');
          setTimeout(hideStatus, 3000);
        } else {
          showStatus('No matching elements found');
          setTimeout(hideStatus, 3000);
        }
      }, function(err) {
        console.error('Failed to get external ID mapping:', err);
      });
    }

    // Connect on page load
    connectWebSocket();
  </script>
</body>
</html>`;

// ============================================================================
// External Viewer Server Management
// ============================================================================

function startViewerServers(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (viewerServerRunning) {
      resolve();
      return;
    }

    try {
      // Start HTTP server to serve the viewer page
      viewerHttpServer = http.createServer((_req, res) => {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(VIEWER_HTML);
      });

      viewerHttpServer.listen(VIEWER_HTTP_PORT, () => {
        console.error(`Viewer HTTP server listening on port ${VIEWER_HTTP_PORT}`);
      });

      // Start WebSocket server
      viewerWsServer = new WebSocketServer({ port: VIEWER_WS_PORT });

      viewerWsServer.on("connection", (ws) => {
        console.error("Viewer WebSocket client connected");
        wsConnection = ws;

        // Send any pending message (e.g. initial model load)
        if (pendingMessage) {
          ws.send(pendingMessage);
          pendingMessage = null;
        }

        ws.on("close", () => {
          console.error("Viewer WebSocket client disconnected");
          if (wsConnection === ws) {
            wsConnection = null;
          }
        });

        ws.on("error", (err) => {
          console.error("Viewer WebSocket error:", err);
        });
      });

      viewerWsServer.on("listening", () => {
        console.error(`Viewer WebSocket server listening on port ${VIEWER_WS_PORT}`);
        viewerServerRunning = true;
        resolve();
      });

      viewerWsServer.on("error", (err) => {
        console.error("WebSocket server error:", err);
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

function sendToViewer(message: string): void {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    wsConnection.send(message);
  } else {
    // Queue the message for when the viewer connects
    console.error("Viewer not connected yet, queuing message");
    pendingMessage = message;
  }
}

// ============================================================================
// PKCE Helpers
// ============================================================================

function generateCodeVerifier(length: number = 64): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const randomValues = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash("sha256").update(verifier).digest("base64");
  // URL-safe base64 encoding
  return hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ============================================================================
// OAuth Callback Server
// ============================================================================

async function waitForOAuthCallback(): Promise<string> {
  return new Promise((resolve, reject) => {
    const callbackServer = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost`);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      res.writeHead(200, { "Content-Type": "text/html" });
      
      if (error) {
        res.end(`
          <html>
            <body style="font-family: sans-serif; padding: 40px; text-align: center;">
              <h1 style="color: #dc2626;">Authentication Failed</h1>
              <p>Error: ${error}</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
        callbackServer.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      res.end(`
        <html>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: #16a34a;">Authentication Successful!</h1>
            <p>You can close this window and return to Claude.</p>
          </body>
        </html>
      `);

      callbackServer.close();
      
      if (code) {
        resolve(code);
      } else {
        reject(new Error("No auth code received"));
      }
    });

    callbackServer.listen(5001, () => {
      console.error("OAuth callback server listening on port 5001");
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      callbackServer.close();
      reject(new Error("OAuth timeout - no callback received"));
    }, 5 * 60 * 1000);
  });
}

// ============================================================================
// Token Exchange (PKCE flow)
// ============================================================================

async function exchangeCodeForToken(authCode: string): Promise<{ access_token: string; refresh_token: string }> {
  const response = await fetch("https://developer.api.autodesk.com/authentication/v2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      code_verifier: codeVerifier!,
      code: authCode,
      scope: SCOPES,
      grant_type: "authorization_code",
      redirect_uri: CALLBACK_URL,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${errorText}`);
  }

  return response.json() as Promise<TokenResponse>;
}

// ============================================================================
// GraphQL Query Helper
// ============================================================================

// Helper to format errors for logging
function formatGraphQLErrors(errors: GraphQLError[]): string {
  return errors.map((e, i) => {
    const parts = [`  [${i + 1}] ${e.message}`];
    if (e.extensions?.correlationId) {
      parts.push(`      Correlation ID: ${e.extensions.correlationId}`);
    }
    if (e.extensions?.code) {
      parts.push(`      Code: ${e.extensions.code}`);
    }
    if (e.path) {
      parts.push(`      Path: ${e.path.join(".")}`);
    }
    return parts.join("\n");
  }).join("\n");
}

async function graphqlQuery(query: string, variables: Record<string, unknown> = {}, region?: string): Promise<GraphQLResult> {
  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  if (region) {
    headers["region"] = region;
  }

  console.error(`[AECDM] Making request with headers:`, JSON.stringify(headers, null, 2));
  console.error(`[AECDM] Variables:`, JSON.stringify(variables));

  const response = await fetch(AECDM_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  console.error(`[AECDM] Response status: ${response.status} ${response.statusText}`);

  const responseText = await response.text();
  console.error(`[AECDM] Response body (first 2000 chars): ${responseText.substring(0, 2000)}`);

  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${responseText}`);
  }

  const result = JSON.parse(responseText) as GraphQLResponse;
  
  if (result.errors && result.errors.length > 0) {
    console.error(`[AECDM] GraphQL errors detected (${result.errors.length}):\n${formatGraphQLErrors(result.errors)}`);
  }

  return {
    data: result.data,
    errors: result.errors,
    hasErrors: !!(result.errors && result.errors.length > 0),
  };
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new McpServer({
  name: "AECDM MCP Hybrid",
  version: "1.0.0",
});

const resourceUri = "ui://aecdm/app.html";

// ============================================================================
// Register UI Resource
// ============================================================================

registerAppResource(
  server,
  resourceUri,
  resourceUri,
  {
    mimeType: RESOURCE_MIME_TYPE,
  },
  async () => {
    const html = await fs.readFile(
      path.join(import.meta.dirname, "dist", "aecdm-app.html"),
      "utf-8"
    );
    return {
      contents: [{
        uri: resourceUri,
        mimeType: RESOURCE_MIME_TYPE,
        text: html,
        _meta: {
          ui: {
            csp: {
              resourceDomains: [
                "https://developer.api.autodesk.com",
                "https://cdn.derivative.autodesk.com",
                "https://fonts.autodesk.com",
                "blob:",
                "data:",
              ],
              connectDomains: [
                "https://developer.api.autodesk.com",
                "https://cdn.derivative.autodesk.com",
                "https://fonts.autodesk.com",
                "wss://cdn.derivative.autodesk.com",
              ],
              frameDomains: [],
            },
          },
        },
      }],
    };
  }
);

// ============================================================================
// Authentication Tools
// ============================================================================

registerAppTool(
  server,
  "authenticate",
  {
    title: "Authenticate with Autodesk",
    description: "Opens browser for Autodesk login using OAuth PKCE flow",
    inputSchema: z.object({}),
    _meta: {
      ui: {
        resourceUri,
        visibility: ["app"],
        csp: {
          scriptSrc: ["https://developer.api.autodesk.com"],
          styleSrc: ["https://developer.api.autodesk.com"],
          connectSrc: ["https://developer.api.autodesk.com", "https://*.autodesk.com"],
        },
      },
    },
  },
  async () => {
    // If already authenticated, return success
    if (accessToken) {
      return { content: [{ type: "text", text: JSON.stringify({ authenticated: true }) }] };
    }

    try {
      // Generate PKCE challenge
      codeVerifier = generateCodeVerifier(64);
      const codeChallenge = generateCodeChallenge(codeVerifier);

      // Build OAuth URL
      const authUrl =
        `https://developer.api.autodesk.com/authentication/v2/authorize?` +
        `response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(CALLBACK_URL)}` +
        `&scope=${SCOPES}&prompt=login&code_challenge=${codeChallenge}&code_challenge_method=S256`;

      // Start callback server and open browser
      const callbackPromise = waitForOAuthCallback();
      await open(authUrl);

      // Wait for OAuth callback
      const authCode = await callbackPromise;

      // Exchange code for token
      const tokens = await exchangeCodeForToken(authCode);
      accessToken = tokens.access_token;
      refreshToken = tokens.refresh_token;

      console.error("Authentication successful!");
      return { content: [{ type: "text", text: JSON.stringify({ authenticated: true }) }] };
    } catch (error) {
      console.error("Authentication failed:", error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              authenticated: false,
              error: error instanceof Error ? error.message : "Unknown error",
            }),
          },
        ],
      };
    }
  }
);

registerAppTool(
  server,
  "check-auth",
  {
    title: "Check Authentication Status",
    description: "Check if user is authenticated with Autodesk",
    inputSchema: z.object({}),
    _meta: { ui: { resourceUri, visibility: ["app"] } },
  },
  async () => {
    return {
      content: [{ type: "text", text: JSON.stringify({ authenticated: !!accessToken }) }],
    };
  }
);

// ============================================================================
// Browse AECDM Tool (Model-visible - can be called by Claude)
// ============================================================================

registerAppTool(
  server,
  "browse-aecdm",
  {
    title: "Browse AECDM",
    description: "Browse Autodesk Construction Cloud hubs, projects, and models. Opens an interactive browser UI.",
    inputSchema: z.object({}),
    _meta: {
      ui: {
        resourceUri,
        csp: {
          scriptSrc: ["https://developer.api.autodesk.com"],
          styleSrc: ["https://developer.api.autodesk.com"],
          connectSrc: ["https://developer.api.autodesk.com", "https://*.autodesk.com"],
        },
      },
    },
  },
  async () => {
    return {
      content: [{ type: "text", text: JSON.stringify({ action: "browse" }) }],
    };
  }
);

// ============================================================================
// Render Model Tool (Model-visible - opens external browser viewer)
// ============================================================================

server.tool(
  "render-model",
  "Render a 3D model in the Autodesk Viewer (opens in a separate browser window). Returns the elementGroupId which can be used for subsequent AECDM GraphQL queries.",
  {
    fileVersionUrn: z.string().describe("The URN of the model to render"),
    elementGroupId: z.string().describe("The element group ID of the model (used for AECDM queries)"),
    elementGroupName: z.string().optional().describe("Name of the element group (for display)"),
  },
  async (args) => {
    if (!accessToken) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: "Not authenticated" }) }],
      };
    }

    // Store current model context so it can be retrieved later
    currentElementGroupId = args.elementGroupId;
    currentElementGroupName = args.elementGroupName || null;
    currentFileVersionUrn = args.fileVersionUrn;

    // Base64-encode the URN (URL-safe)
    const urnBase64 = Buffer.from(args.fileVersionUrn)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const isFirstLoad = !viewerServerRunning;

    try {
      // Start HTTP and WebSocket servers if not already running
      await startViewerServers();

      // Build the load-model message
      const message = JSON.stringify({
        type: "load-model",
        urn: urnBase64,
        accessToken: accessToken,
      });

      if (isFirstLoad) {
        // Queue message for when the browser connects via WebSocket
        pendingMessage = message;
        // Open browser
        await open(`http://localhost:${VIEWER_HTTP_PORT}/`);
        console.error(`Opened browser to viewer at http://localhost:${VIEWER_HTTP_PORT}/`);
      } else {
        // Send directly to the already-connected viewer
        sendToViewer(message);
      }

      const modelName = args.elementGroupName || "Model";
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              action: "model-sent",
              elementGroupId: args.elementGroupId,
              modelName,
              message: `Model "${modelName}" has been sent to the external viewer. The elementGroupId is "${args.elementGroupId}" — use this for subsequent AECDM GraphQL queries.`,
            }),
          },
        ],
      };
    } catch (error) {
      console.error("Failed to render model:", error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: error instanceof Error ? error.message : "Failed to open viewer",
            }),
          },
        ],
      };
    }
  }
);

// ============================================================================
// Highlight Elements Tool (Model-visible - sends to external browser viewer)
// ============================================================================

server.tool(
  "highlight-elements",
  "Highlight specific elements in the viewer by their external IDs",
  {
    externalIds: z.array(z.string()).describe("Array of external IDs to highlight"),
  },
  async (args) => {
    if (!viewerServerRunning || !wsConnection) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Viewer is not connected. Please render a model first.",
            }),
          },
        ],
      };
    }

    const message = JSON.stringify({
      type: "highlight",
      externalIds: args.externalIds,
    });

    sendToViewer(message);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            highlighted: args.externalIds.length,
            message: `Sent ${args.externalIds.length} element(s) to the viewer for highlighting.`,
          }),
        },
      ],
    };
  }
);

// ============================================================================
// Get Model Context Tool (Model-visible - returns current model state)
// ============================================================================

server.tool(
  "get-model-context",
  "Returns the currently loaded model's elementGroupId, name, and fileVersionUrn. Use this to retrieve the elementGroupId needed for AECDM GraphQL queries if you don't already have it from a previous render-model call.",
  {},
  async () => {
    if (!currentElementGroupId) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "No model is currently loaded. Use browse-aecdm to select and load a model first.",
            }),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            elementGroupId: currentElementGroupId,
            elementGroupName: currentElementGroupName,
            fileVersionUrn: currentFileVersionUrn,
            message: `Current model: "${currentElementGroupName || "Unknown"}". Use elementGroupId "${currentElementGroupId}" for AECDM GraphQL queries.`,
          }),
        },
      ],
    };
  }
);

// ============================================================================
// Data Fetching Tools (App-only visibility)
// ============================================================================

registerAppTool(
  server,
  "get-hubs",
  {
    title: "Get Hubs",
    description: "Fetch all ACC hubs for the authenticated user",
    inputSchema: z.object({}),
    _meta: { ui: { resourceUri, visibility: ["app"] } },
  },
  async () => {
    try {
      const result = await graphqlQuery(`
        query {
          hubs {
            pagination { cursor }
            results {
              id
              name
            }
          }
        }
      `);
      
      if (result.hasErrors && result.data) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ...result.data as object,
                _warnings: result.errors?.map(e => ({
                  message: e.message,
                  correlationId: e.extensions?.correlationId,
                })),
              }),
            },
          ],
        };
      }
      
      if (result.hasErrors && !result.data) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: result.errors?.[0]?.message || "Unknown error",
                correlationId: result.errors?.[0]?.extensions?.correlationId,
              }),
            },
          ],
        };
      }
      
      return { content: [{ type: "text", text: JSON.stringify(result.data) }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
          },
        ],
      };
    }
  }
);

registerAppTool(
  server,
  "get-projects",
  {
    title: "Get Projects",
    description: "Fetch projects for a specific hub",
    inputSchema: z.object({
      hubId: z.string().describe("Hub ID to fetch projects from"),
    }) as z.ZodObject<z.ZodRawShape>,
    _meta: { ui: { resourceUri, visibility: ["app"] } },
  },
  async (args) => {
    const { hubId } = args as { hubId: string };
    try {
      const result = await graphqlQuery(
        `
        query GetProjects($hubId: ID!) {
          projects(hubId: $hubId) {
            pagination { cursor }
            results {
              id
              name
            }
          }
        }
      `,
        { hubId }
      );
      
      if (result.hasErrors && result.data) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ...result.data as object,
                _warnings: result.errors?.map(e => ({
                  message: e.message,
                  correlationId: e.extensions?.correlationId,
                })),
              }),
            },
          ],
        };
      }
      
      if (result.hasErrors && !result.data) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: result.errors?.[0]?.message || "Unknown error",
                correlationId: result.errors?.[0]?.extensions?.correlationId,
              }),
            },
          ],
        };
      }
      
      return { content: [{ type: "text", text: JSON.stringify(result.data) }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
          },
        ],
      };
    }
  }
);

registerAppTool(
  server,
  "get-element-groups",
  {
    title: "Get Element Groups",
    description: "Fetch element groups (models) for a specific project",
    inputSchema: z.object({
      projectId: z.string().describe("Project ID to fetch element groups from"),
    }) as z.ZodObject<z.ZodRawShape>,
    _meta: { ui: { resourceUri, visibility: ["app"] } },
  },
  async (args) => {
    const { projectId } = args as { projectId: string };
    try {
      const result = await graphqlQuery(
        `
        query GetElementGroupsByProject($projectId: ID!) {
          elementGroupsByProject(projectId: $projectId) {
            results {
              id
              name
              alternativeIdentifiers {
                fileVersionUrn
              }
            }
          }
        }
      `,
        { projectId }
      );
      
      if (result.hasErrors && result.data) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ...result.data as object,
                _warnings: result.errors?.map(e => ({
                  message: e.message,
                  correlationId: e.extensions?.correlationId,
                })),
              }),
            },
          ],
        };
      }
      
      if (result.hasErrors && !result.data) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: result.errors?.[0]?.message || "Unknown error",
                correlationId: result.errors?.[0]?.extensions?.correlationId,
              }),
            },
          ],
        };
      }
      
      return { content: [{ type: "text", text: JSON.stringify(result.data) }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
          },
        ],
      };
    }
  }
);

registerAppTool(
  server,
  "get-elements-by-category",
  {
    title: "Get Elements by Category",
    description: "Fetch elements from an element group filtered by category",
    inputSchema: z.object({
      elementGroupId: z.string().describe("Element group ID"),
      category: z.string().describe("Category filter (e.g., Walls, Windows, Floors, Doors, Furniture, Ceilings, Electrical Equipment)"),
    }) as z.ZodObject<z.ZodRawShape>,
    _meta: { ui: { resourceUri, visibility: ["app"] } },
  },
  async (args) => {
    const { elementGroupId, category } = args as { elementGroupId: string; category: string };
    try {
      const result = await graphqlQuery(
        `
        query GetElementsByElementGroupWithFilter($elementGroupId: ID!, $filter: String!) {
          elementsByElementGroup(elementGroupId: $elementGroupId, filter: {query: $filter}) {
            results {
              id
              name
              properties {
                results {
                  name
                  value
                }
              }
            }
          }
        }
      `,
        {
          elementGroupId,
          filter: `property.name.category==${category}`,
        }
      );
      
      if (result.hasErrors && result.data) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ...result.data as object,
                _warnings: result.errors?.map(e => ({
                  message: e.message,
                  correlationId: e.extensions?.correlationId,
                })),
              }),
            },
          ],
        };
      }
      
      if (result.hasErrors && !result.data) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: result.errors?.[0]?.message || "Unknown error",
                correlationId: result.errors?.[0]?.extensions?.correlationId,
              }),
            },
          ],
        };
      }
      
      return { content: [{ type: "text", text: JSON.stringify(result.data) }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
          },
        ],
      };
    }
  }
);

server.tool(
  "execute-query",
  "Execute a custom GraphQL query against the AECDM API",
  {
    query: z.string().describe("GraphQL query string"),
    variables: z.string().optional().describe("JSON string of variables"),
    region: z.string().optional().describe("API region: US, EMEA, or APAC"),
  },
  async (args) => {
    try {
      const variables = args.variables ? JSON.parse(args.variables) : {};
      const result = await graphqlQuery(args.query, variables, args.region);
      
      const response: { data?: unknown; errors?: Array<{ message: string; correlationId?: string }> } = {};
      
      if (result.data) {
        response.data = result.data;
      }
      
      if (result.hasErrors) {
        response.errors = result.errors?.map(e => ({
          message: e.message,
          correlationId: e.extensions?.correlationId,
        }));
      }
      
      return { content: [{ type: "text", text: JSON.stringify(response) }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ errors: [{ message: error instanceof Error ? error.message : "Unknown error" }] }),
          },
        ],
      };
    }
  }
);

// ============================================================================
// Stdio Server Setup (auto-launched by Cursor via .cursor/mcp.json)
// ============================================================================

async function main() {
  console.error("Starting AECDM MCP Hybrid server (stdio transport)...");
  console.error(`CLIENT_ID: ${CLIENT_ID?.substring(0, 8)}...`);
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("AECDM MCP Hybrid server connected via stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
