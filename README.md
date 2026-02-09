# AECDM Claude Skill + MCP Server

Query Autodesk's AEC Data Model (AECDM) GraphQL API from within Cursor, powered by an **Agent Skill** that teaches Claude how to construct correct queries and an **MCP Server** that handles authentication, model browsing, 3D visualization, and query execution.

## What's Included

| Folder | Purpose |
|--------|---------|
| `SKILL/` | Agent Skill - structured documentation that teaches Claude how to write valid AECDM GraphQL queries |
| `mcp-aecdm-hybrid/` | MCP Server - handles Autodesk OAuth, provides an in-app hub/project browser, launches an external 3D viewer, and executes GraphQL queries |

## Prerequisites

- [Cursor IDE](https://cursor.com/) (with Claude model access)
- [Node.js](https://nodejs.org/) v18 or later
- An **Autodesk Platform Services (APS)** application registered at the [Autodesk Developer Portal](https://aps.autodesk.com/)
  - The app must use the **Authorization Code with PKCE** grant type (public client, no client secret needed)
  - Add `http://localhost:5001/` as a **Callback URL** in your app settings
  - Required scopes: `data:read`, `viewables:read`

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/aecdm-claude-skill.git
```

### 2. Install the Agent Skill

The `SKILL/` folder contains structured documentation that Claude reads at query time. To install it as a Cursor Agent Skill, add an entry to your global skills configuration:

**Option A: Global skill (available in all projects)**

Add the following to your `~/.cursor/skills/<skill-name>/` directory by copying (or symlinking) the `SKILL/` folder:

```bash
# Copy the skill folder
cp -r SKILL ~/.cursor/skills/aecdm-graphql
```

Then reference it in your Cursor settings or `.cursorrules` file:

```
Skill: aecdm-graphql
Path: ~/.cursor/skills/aecdm-graphql/SKILL.md
```

**Option B: Project-level skill (for a specific workspace)**

Copy the `SKILL/` folder into your project and reference it from a `.cursorrules` or project-level skill configuration.

The skill includes:
- `SKILL.md` - Entry point with retrieval rules, anti-patterns, and workflow instructions
- `instructions/` - Semantic guidance (how to think about queries, traversals, filters)
- `references/` - Schema reference (exact field names, types, enums, input shapes)

### 3. Install the MCP Server

```bash
cd mcp-aecdm-hybrid
npm install
npm run build
```

This compiles:
- The React UI (hub browser) via Vite into `build/dist/`
- The MCP server (TypeScript) via `tsc` into `build/server.js`

### 4. Configure the MCP Server in Cursor

Add the following to your project's `.cursor/mcp.json` (or the global Cursor MCP config):

```json
{
  "mcpServers": {
    "aecdm-hybrid": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-aecdm-hybrid/build/server.js"],
      "env": {
        "CLIENT_ID": "YOUR_APS_CLIENT_ID"
      }
    }
  }
}
```

Replace:
- `/absolute/path/to/mcp-aecdm-hybrid/` with the actual path to the `mcp-aecdm-hybrid` folder
- `YOUR_APS_CLIENT_ID` with your Autodesk Platform Services application Client ID

---

## Usage

### Authenticating

When you first interact with the AECDM tools, Claude will call the `authenticate` tool. This opens your default browser to the Autodesk login page. After signing in, the OAuth token is stored in the server's memory for the duration of the session.

### Browsing Models

Ask Claude to browse your ACC models, or it will automatically open the browser when needed:

> "Show me my ACC projects"
> "Browse my Autodesk Construction Cloud models"

The in-app hub browser lets you navigate **Hubs > Projects > Models** and select a model to load.

### Viewing 3D Models

When you select a model in the browser (or ask Claude to render one), the server opens an **external browser window** with the Autodesk Viewer. The viewer connects to the MCP server via WebSocket and stays synchronized - you can switch models from the in-app browser and the viewer updates automatically.

### Querying the AECDM API

Once a model is loaded, ask Claude to query it using natural language:

> "List all the walls in this model"
> "What levels does this model have?"
> "Find all doors on Level 1"
> "Show me the properties of the windows"
> "Get all furniture on the ground floor and highlight them"

The Skill guides Claude through:
1. Calling `get-model-context` to retrieve the current `elementGroupId`
2. Constructing a valid GraphQL query following AECDM schema rules
3. Executing the query via `execute-query`
4. Chaining multi-step queries when needed (e.g., discovering levels before filtering by one)
5. Highlighting results in the 3D viewer via `highlight-elements`

### MCP Tools Reference

| Tool | Description |
|------|-------------|
| `authenticate` | Initiates Autodesk OAuth PKCE login flow |
| `check-auth` | Checks current authentication status |
| `browse-aecdm` | Opens the in-app hub/project/model browser |
| `render-model` | Sends a model to the external 3D viewer |
| `highlight-elements` | Highlights elements in the viewer by external ID |
| `get-model-context` | Returns the current model's `elementGroupId` for queries |
| `execute-query` | Executes a custom GraphQL query against the AECDM API |
| `get-hubs` | Fetches ACC hubs (used internally by the browser UI) |
| `get-projects` | Fetches projects for a hub (used internally by the browser UI) |
| `get-element-groups` | Fetches models for a project (used internally by the browser UI) |
| `get-elements-by-category` | Fetches elements filtered by category (used internally by the browser UI) |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Cursor IDE                       │
│                                                     │
│  ┌──────────────┐    ┌────────────────────────────┐ │
│  │  Claude +     │◄──►│   MCP Server (stdio)       │ │
│  │  AECDM Skill  │    │   - OAuth PKCE auth        │ │
│  └──────────────┘    │   - GraphQL execution       │ │
│                      │   - Model context tracking  │ │
│  ┌──────────────┐    │                              │ │
│  │  In-App UI    │◄──►│   (registerAppTool /        │ │
│  │  Hub Browser  │    │    registerAppResource)     │ │
│  └──────────────┘    └────────────┬───────────────┘ │
│                                   │ WebSocket        │
└───────────────────────────────────┼─────────────────┘
                                    │
                      ┌─────────────▼──────────────┐
                      │   External Browser Window   │
                      │   Autodesk Viewer (3D)      │
                      │   - Model rendering         │
                      │   - Element highlighting     │
                      └─────────────────────────────┘
```

- The **Skill** provides Claude with structured knowledge about the AECDM GraphQL schema, valid entry points, filter patterns, and anti-patterns
- The **MCP Server** communicates with Cursor over stdio, serves the React-based hub browser as an in-app UI, and manages an external viewer via HTTP + WebSocket
- The **External Viewer** renders 3D models using the Autodesk Viewer SDK in a separate browser tab

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MCP server fails to start | Ensure `npm run build` completed successfully and the path in `mcp.json` is correct |
| Authentication fails | Verify your CLIENT_ID is correct and `http://localhost:5001/` is registered as a callback URL |
| Viewer doesn't open | Check that ports 8080 and 8081 are available (used for the viewer HTTP and WebSocket servers) |
| "No model loaded" error | Use `browse-aecdm` to select a model first, or ask Claude to browse your projects |
| Query returns errors | The Skill includes error handling guidance - Claude will attempt to self-correct up to 3 times |

## License

See [LICENSE](LICENSE) for details.
