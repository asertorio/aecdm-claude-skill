---
name: aecdm-graphql
description: Construct correct AECDM GraphQL queries using structured documentation.
---

## Documentation Architecture

```
📁 instructions/          ← Semantic guidance (HOW to think)
│   00_start_here.md         Core rules, hierarchy, explicit warnings
│   01_query_entry_points.md Valid entry points only
│   02_core_object_model.md  Object hierarchy and traversal
│   03_relationships_vs_properties.md  Critical: Level ≠ property
│   04_property_system.md    Property types and filtering
│   05_versioning_and_time.md Version model
│   06_filters_and_inputs.md Filter input types
│   07_query_patterns.md     Reusable query templates
│
📁 references/            ← Schema reference (WHAT exists)
    ref_00 through ref_10    Field names, argument shapes, types
```

---

## Document Retrieval Rules

### Always Retrieve (Mandatory Foundation)

Before constructing ANY AECDM GraphQL query, retrieve:

| Document | Purpose |
|----------|---------|
| `instructions/00_start_here.md` | Core rules, hierarchy diagram, explicit warnings |
| `instructions/02_core_object_model.md` | Object types and how they connect |

### Conditionally Retrieve (Trigger-Based)

| When the query involves... | Retrieve |
|---------------------------|----------|
| Level, Space, Room, Host, Type, references, relationships | `instructions/03_relationships_vs_properties.md` |
| filter, where, search, narrow, Category, property values | `instructions/06_filters_and_inputs.md` |
| property comparison, dimension filter, Length, RSQL, `query` filter | `instructions/06_filters_and_inputs.md` |
| version, history, tip, snapshot, time, compare | `instructions/05_versioning_and_time.md` |
| property, Area, Volume, Mark, metadata, parameters | `instructions/04_property_system.md` |
| entry point selection, where to start | `instructions/01_query_entry_points.md` |

### Prefer Existing Patterns

**Before constructing any new query:**
1. Retrieve `instructions/07_query_patterns.md`
2. Find the closest matching pattern
3. Adapt it — do not invent from scratch

---

## Document Role Separation

### Use `ref_*` Documents For:
- Confirming exact field names and argument names
- Verifying input type shapes and required fields
- Checking enum values (Comparators, ExtractionStatus, etc.)
- Validating scalar types (DateTime, PropertyValue, etc.)

### Use Instructional (non-`ref_*`) Documents For:
- Deciding traversal strategy and entry points
- Understanding filter placement and relationship semantics
- Learning anti-patterns and common mistakes
- Choosing between similar approaches

**Rule of thumb:**
> "Use `ref_*` documents to confirm field names, argument shapes, and valid types.
> Use non-`ref_*` documents to decide traversal strategy, filter placement, and relationship semantics."

---

## Critical Constraints

### NEVER Do These:

| Forbidden Action | Why It Fails |
|-----------------|--------------|
| Access `element.level` as a scalar | Level is a **reference** to another Element |
| Filter by `level: "Level 1"` at element level | Must filter via `references` with Level's element ID |
| Treat Level, Space, Room, Type as properties | These are **references** — relationships to other Elements |
| Invent entry points like `levels()` or `model()` | Only entry points in `01_query_entry_points.md` exist |
| Construct filters without checking `ref_*` docs | Filter fields must exist on the input type |
| Infer relationships from field names alone | Always verify against documentation |
| Assume a level name like "Ground Floor" or "Level 1" exists | Always **discover levels first** (filter by Category = Levels), then pick by best match |

### ALWAYS Do These:

| Required Action | Example |
|----------------|---------|
| Query Level through references | `references(filter: {names: ["Level"]}) { results { value { id name } } }` |
| Use validated entry points | `elementsByElementGroup`, `elementGroupAtTip`, `elementAtTip` |
| Check pagination for lists | Include `pagination { cursor }` and `totalCount` |
| Verify filter fields exist | Check `ElementFilterInput` in `ref_05_elements.graphql.md` |
| Use `tipVersion` for latest data | `elementGroupAtTip` or `versionHistory.tipVersion` |
| Type `referenceId` variables as `String` | `referenceId` expects `String`/`[String!]`, **not** `ID` — e.g. `$levelId: String!`, `$typeIds: [String!]!` |
| Discover levels before filtering by one | Query levels first (`Category` = `Levels`), then pick by best name match — never hardcode a level name |

---

## Quick Reference: Common Scenarios

| I want to... | Entry Point | Key Fields |
|--------------|-------------|------------|
| Get elements from a model | `elementsByElementGroup(elementGroupId)` | `results { id name }` |
| Get element's level | `elementAtTip(elementId)` | `references(filter: {names: ["Level"]}) { results { value { name } } }` |
| Filter by category | `elementsByElementGroup` + filter | `filter: { properties: [{ name: "Category", value: ["Walls"] }] }` |
| Find elements on a level | `elementsByElementGroup` + filter | `filter: { references: [{ name: "Level", referenceId: ["{{levelId}}"] }] }` |
| Get model at latest version | `elementGroupAtTip(elementGroupId)` | Direct access to tip |
| Discover all levels (always do first) | `elementsByElementGroup` + filter | `filter: { properties: [{ name: "Category", value: ["Levels"] }] }` |
| Find elements by a Type property (e.g. wide doors) | Two-step: `elementsByElementGroup` x2 | Step 1: query Types by property → collect Type IDs. Step 2: filter instances by `references: [{name: "Type", referenceId: $typeIds}]` |

---

## Reference Document Index

| Document | Contains |
|----------|----------|
| `ref_00_schema-core.graphql.md` | Scalars (DateTime, PropertyValue), Enums (Comparators), Directives |
| `ref_01_query-and-subscription.graphql.md` | Query and Subscription root types |
| `ref_02_pagination.graphql.md` | Pagination, PaginationInput |
| `ref_03_hubs-projects-folders.graphql.md` | Hub, Project, Folder types and filters |
| `ref_04_element-groups-and-versions.graphql.md` | ElementGroup, ElementGroupVersion, version history |
| `ref_05_elements.graphql.md` | Element type, ElementFilterInput, ElementPropertyFilterInput |
| `ref_06_properties-values-and-distinct.graphql.md` | Property, PropertyValue, distinct value queries |
| `ref_07_property-definitions.graphql.md` | PropertyDefinition type |
| `ref_08_property-definition-collections.graphql.md` | PropertyDefinitionCollection |
| `ref_09_reference-properties.graphql.md` | ReferenceProperty, ReferencePropertyFilterInput |
| `ref_10_users-and-units.graphql.md` | User, Units types |

---

## Anti-Pattern Detection

If you find yourself doing any of these, STOP and re-read the relevant instructional document:

| Warning Sign | Correct Action |
|-------------|----------------|
| Writing `element.level` | Use `element.references(filter: {names: ["Level"]})` |
| Writing `filter: { level: "..." }` | Use `filter: { references: [{ name: "Level", referenceId: [...] }] }` |
| Looking for Level in `properties` | Level is a reference, not a property |
| Inventing `levels()` or `rooms()` entry points | Use `elementsByElementGroup` with appropriate filters |
| Skipping pagination on list queries | Always check `pagination.cursor` for more results |
| Treating `references.value` as a string | `value` is an Element object with `id`, `name`, etc. |
| Declaring `referenceId` variables as `ID` | `referenceId` expects `String` — use `$levelId: String!`, not `$levelId: ID!` |
| Filtering instances by a property that lives on the Type | Use a two-step query: find matching Type IDs first, then filter instances by Type reference |
| Hardcoding a level name like `"Ground Floor"` or `"Level 1"` | Discover levels first, then pick by best match — level names vary across models |

---

## Model Context and Reuse

When a model is loaded via the `render-model` tool, the response includes the `elementGroupId`. This ID is required for nearly all AECDM GraphQL queries. The MCP server also stores this value and can return it via `get-model-context`.

**Important:** The user can change the loaded model at any time via the hub browser UI without Claude being directly involved. When this happens, the server-side model context is updated and `app.updateModelContext()` pushes the new context to Claude. However, to guarantee correctness, Claude must always verify the current model context before constructing queries.

### Rules for Model Context

| Rule | Details |
|------|---------|
| **ALWAYS call `get-model-context` before constructing any query** | The user may have changed the model via the browser at any time. Always call `get-model-context` to get the latest `elementGroupId` before each query or query chain. Do NOT rely on a previously cached `elementGroupId` from conversation history. |
| **Only call `browse-aecdm` when no model has been loaded** | The browser UI is only needed for the initial model selection. If `get-model-context` returns an error saying no model is loaded, then call `browse-aecdm`. |
| **Do NOT cache the elementGroupId across turns** | Each time you need to construct a query, call `get-model-context` fresh. The model may have changed between turns. |

### Model Context Flow

```
User asks a query → call get-model-context
                  → GOT elementGroupId: construct query + call execute-query
                  → NO model loaded:    call browse-aecdm to select a model
                                        → then call get-model-context again
```

---

## MCP Execution Workflow

This skill uses MCP (Model Context Protocol) tools to authenticate and execute queries against the AECDM API.

### MCP Tool Reference

| Tool | Purpose |
|------|---------|
| `authenticate` | Authenticate via OAuth PKCE flow and obtain access token |
| `execute-query` | Execute a dynamically constructed GraphQL query with variables |
| `get-model-context` | Returns the currently loaded model's elementGroupId, name, and URN |
| `render-model` | Render a model in the viewer; returns the elementGroupId for subsequent queries |
| `highlight-elements` | Highlight elements in the viewer by their external IDs |

### execute-query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | The GraphQL query string |
| `variables` | string | No | JSON object of query variables (e.g., `{"hubId": "xxx"}`) |
| `region` | string | No | API region: `US`, `EMEA`, or `APAC` |

### Workflow Steps

```
1. Resolve Model Context → ALWAYS call get-model-context to get the latest elementGroupId
2. Plan Query Chain      → Determine if single or multi-step query needed
3. Construct Query       → Build query following this skill's guidance
4. Execute               → Call execute-query with query + variables
5. Handle Result         → Process success or handle errors
```

**Step-by-step:**

1. **Resolve model context** - Before constructing any query, **always** call `get-model-context` to get the current `elementGroupId`:
   - **If it returns an elementGroupId**, use it for the query. Do NOT reuse a previously cached value from conversation history — the user may have switched models via the browser.
   - **If it returns an error (no model loaded)**, use `browse-aecdm` to let the user select a model, then call `get-model-context` again.

2. **Plan the query chain** - Analyze the user request to determine if it requires:
   - Single query (e.g., "list all walls")
   - Multi-step chain (e.g., "get all walls on Level 1" requires: get levels → find Level 1 ID → filter elements)

3. **Construct query** - Build the GraphQL query following this skill's documentation:
   - Retrieve required instructional documents
   - Use validated entry points and filter patterns
   - Check `ref_*` docs for exact field names

4. **Execute** - Call `execute-query` MCP tool with:
   ```json
   {
     "query": "query GetWalls($elementGroupId: ID!) { elementsByElementGroup(elementGroupId: $elementGroupId, filter: { properties: [{ name: \"Category\", value: [\"Walls\"] }] }) { results { id name } } }",
     "variables": "{\"elementGroupId\": \"your-element-group-id\"}",
     "region": "US"
   }
   ```

5. **Handle result**:
   - **Success + more queries needed**: Extract IDs, construct next query, go to step 3
   - **Success + done**: Return final results to user
   - **Success + visual feedback needed**: Call `highlight-elements` with external IDs to filter/highlight in the viewer
   - **Error**: Go to Error Handling section

---

## Error Handling

When a query fails, follow this error correction loop:

### Error Correction Loop

```
1. Parse Error      → Extract error message from response
2. Identify Issue   → Determine error type (field, filter, auth, etc.)
3. Consult Docs     → Find correct syntax in ref_* documents
4. Fix Query        → Apply correction to query
5. Retry            → Execute again (max 3 attempts)
```

### Error Type Reference

| Error Type | Indicator | Resolution |
|------------|-----------|------------|
| Field not found | `Cannot query field "X"` | Check `ref_05_elements.graphql.md` for valid field names |
| Invalid filter | `Unknown argument` or filter syntax errors | Check `ref_06_filters_and_inputs.graphql.md` for filter structure |
| Invalid enum | `Enum value not found` | Check `ref_00_schema-core.graphql.md` for valid enum values |
| Missing argument | `Argument "X" is required` | Add required argument from relevant `ref_*` doc |
| Auth error (401) | `Unauthorized` or `401` status | Re-authenticate via `authenticate`, then retry |
| Rate limited (429) | `Too Many Requests` | Wait and retry (MCP handles automatically) |

### Error Response Format

The `execute-query` tool returns errors in this format:
```json
{
  "errors": [
    { "message": "Cannot query field \"invalidField\" on type \"Element\"" }
  ]
}
```

### Fix Strategy

1. **Parse the error message** to identify the problematic field, argument, or syntax
2. **Locate the relevant reference document** based on what you're querying
3. **Find the correct syntax** in the reference document
4. **Update the query** with the correction
5. **Retry execution** - do not exceed 3 attempts for the same error type

---

## Multi-Step Query Chaining

Many user requests require multiple queries where results from one query feed into the next.

### Common Query Chains

| Goal | Chain |
|------|-------|
| Get elements from the loaded model | Use `elementGroupId` from model context → `elementsByElementGroup` |
| Get elements on a specific level | Use `elementGroupId` → Discover Levels (Category = Levels) → pick best match → Elements (filtered by Level) |
| Get all properties of specific elements | Use `elementGroupId` → Elements (to get IDs) → Element details with properties |
| Get elements from a different project | Hub → Project → ElementGroup → Elements (only if no model is loaded) |
| Get instances matching a Type property on a Level | Types (filter by property via RSQL `query`) → collect Type IDs → Instances (filtered by Level + Type references) |

### Chaining Workflow

```
┌─────────────────┐
│  User Request   │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Plan Query Chain│  ← Determine all queries needed
└────────┬────────┘
         ▼
┌─────────────────┐
│ Execute Query 1 │
└────────┬────────┘
         ▼
┌─────────────────┐
│  Extract IDs    │  ← Pull IDs from results for next query
└────────┬────────┘
         ▼
┌─────────────────┐
│ Execute Query 2 │  ← Use extracted IDs as variables
└────────┬────────┘
         ▼
    (repeat as needed)
         ▼
┌─────────────────┐
│  Return Results │
└─────────────────┘
```

### Example: Get All Walls on Level 1

> **Important:** Do not assume a level name like "Level 1" or "Ground Floor" exists.
> Always discover levels first by querying with `Category` = `Levels`, then pick the best match from the results.

**Step 1: Discover levels and find the target level's element ID**
```graphql
query DiscoverLevels($elementGroupId: ID!) {
  elementsByElementGroup(elementGroupId: $elementGroupId, 
    filter: { 
      properties: [{ name: "Category", value: ["Levels"] }]
    }) {
    results { id name }
  }
}
```
Variables: `{"elementGroupId": "your-element-group-id"}`

Pick the level that best matches the user's intent (e.g. "Level 1") from the returned results.

**Step 2: Extract the Level ID from results**
```json
{
  "data": {
    "elementsByElementGroup": {
      "results": [{ "id": "level-1-element-id", "name": "Level 1" }]
    }
  }
}
```

**Step 3: Query walls filtered by Level reference**
```graphql
query GetWallsOnLevel($elementGroupId: ID!, $levelId: String!) {
  elementsByElementGroup(elementGroupId: $elementGroupId,
    filter: {
      properties: [{ name: "Category", value: ["Walls"] }],
      references: [{ name: "Level", referenceId: [$levelId] }]
    }) {
    results { id name properties { results { name value } } }
  }
}
```
Variables: `{"elementGroupId": "your-element-group-id", "levelId": "level-1-element-id"}`

### ID Extraction Patterns

| From Query | Extract | For Next Query |
|------------|---------|----------------|
| `hubs` | `results[].id` | `projects(hubId: $hubId)` |
| `projects` | `results[].id` | `elementGroupsByProject(projectId: $projectId)` |
| `elementGroupsByProject` | `results[].id` | `elementsByElementGroup(elementGroupId: $elementGroupId)` |
| Level/Space elements | `results[].id` | `filter: { references: [{ name: "Level", referenceId: [$id] }] }` |
| Type elements (matching a property) | `results[].id` | `filter: { references: [{ name: "Type", referenceId: $typeIds }] }` |
