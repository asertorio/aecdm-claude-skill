# AECDM GraphQL — Query Patterns

This document provides **reusable, safe query templates** that you can copy and adapt.

> **Prefer these patterns.** They are tested and avoid common mistakes.

---

## Placeholder Convention

All queries use `{{placeholder}}` syntax for values you need to provide:

| Placeholder | Description |
|-------------|-------------|
| `{{hubId}}` | Hub identifier |
| `{{projectId}}` | Project identifier |
| `{{folderId}}` | Folder identifier |
| `{{elementGroupId}}` | ElementGroup (model) identifier |
| `{{elementId}}` | Element identifier |
| `{{levelElementId}}` | Element ID of a Level |
| `{{propertyDefinitionId}}` | Property definition identifier |
| `{{cursor}}` | Pagination cursor from previous response |

---

## Navigation Patterns

### Pattern: List All Hubs

```graphql
query ListHubs {
  hubs {
    pagination { cursor }
    results {
      id
      name
    }
  }
}
```

### Pattern: Hub → Projects

```graphql
query GetProjectsInHub($hubId: ID!) {
  hub(hubId: $hubId) {
    id
    name
    projects {
      pagination { cursor }
      results {
        id
        name
      }
    }
  }
}

# Variables:
# { "hubId": "{{hubId}}" }
```

### Pattern: Project → Top-Level Folders

```graphql
query GetTopFolders($projectId: ID!) {
  foldersByProject(projectId: $projectId) {
    results {
      id
      name
      path
    }
  }
}

# Variables:
# { "projectId": "{{projectId}}" }
```

### Pattern: Folder → Subfolders and Models

```graphql
query GetFolderContents($projectId: ID!, $folderId: ID!) {
  folder(projectId: $projectId, folderId: $folderId) {
    id
    name
    path
    folders {
      results {
        id
        name
      }
    }
    elementGroups {
      results {
        id
        name
      }
    }
  }
}

# Variables:
# { "projectId": "{{projectId}}", "folderId": "{{folderId}}" }
```

### Pattern: Project → All Models (Recursively)

```graphql
query GetAllModelsInProject($projectId: ID!) {
  project(projectId: $projectId) {
    name
    elementGroups {
      pagination { cursor }
      results {
        id
        name
        parentFolder {
          path
        }
      }
    }
  }
}

# Variables:
# { "projectId": "{{projectId}}" }
```

---

## Element Query Patterns

### Pattern: Get All Elements from a Model

```graphql
query GetAllElements($elementGroupId: ID!) {
  elementsByElementGroup(elementGroupId: $elementGroupId) {
    totalCount
    pagination { cursor pageSize }
    results {
      id
      name
    }
  }
}

# Variables:
# { "elementGroupId": "{{elementGroupId}}" }
```

### Pattern: Get All Elements with Pagination

```graphql
query GetElementsPaginated($elementGroupId: ID!, $cursor: String, $limit: Int = 100) {
  elementsByElementGroup(
    elementGroupId: $elementGroupId
    pagination: { cursor: $cursor, limit: $limit }
  ) {
    totalCount
    pagination {
      cursor    # Use this for next page (null when done)
      pageSize
    }
    results {
      id
      name
    }
  }
}

# First page:
# { "elementGroupId": "{{elementGroupId}}", "cursor": null }

# Next page:
# { "elementGroupId": "{{elementGroupId}}", "cursor": "{{cursor}}" }
```

### Pattern: Get Single Element by ID

```graphql
query GetElement($elementId: ID!) {
  elementAtTip(elementId: $elementId) {
    id
    name
    createdOn
    createdBy { userName }
    lastModifiedOn
    lastModifiedBy { userName }
    elementGroup {
      id
      name
    }
  }
}

# Variables:
# { "elementId": "{{elementId}}" }
```

### Pattern: Elements Filtered by Name

```graphql
query GetElementsByName($elementGroupId: ID!, $names: [String!]!) {
  elementsByElementGroup(
    elementGroupId: $elementGroupId
    filter: { name: $names }
  ) {
    totalCount
    results {
      id
      name
    }
  }
}

# Variables:
# { "elementGroupId": "{{elementGroupId}}", "names": ["Wall", "Door"] }
```

### Pattern: Elements Filtered by Name Pattern

```graphql
query GetElementsByNamePattern($elementGroupId: ID!, $pattern: String!) {
  elementsByElementGroup(
    elementGroupId: $elementGroupId
    filter: {
      nameWithComparator: [
        { value: $pattern, comparator: CONTAINS }
      ]
    }
  ) {
    results {
      id
      name
    }
  }
}

# Variables:
# { "elementGroupId": "{{elementGroupId}}", "pattern": "Level" }
```

---

## Property Query Patterns

### Pattern: Get Element with All Properties

```graphql
query GetElementWithProperties($elementId: ID!) {
  elementAtTip(elementId: $elementId) {
    id
    name
    properties {
      pagination { cursor }
      results {
        name
        value
        displayValue
        definition {
          specification
          units { name }
        }
      }
    }
  }
}

# Variables:
# { "elementId": "{{elementId}}" }
```

### Pattern: Get Specific Properties from Element

```graphql
query GetSpecificProperties($elementId: ID!, $propertyNames: [String!]!) {
  elementAtTip(elementId: $elementId) {
    id
    name
    properties(filter: { names: $propertyNames }) {
      results {
        name
        value
        displayValue
      }
    }
  }
}

# Variables:
# { "elementId": "{{elementId}}", "propertyNames": ["Area", "Volume", "Mark"] }
```

### Pattern: Elements Filtered by Property Value

```graphql
query GetElementsByCategory($elementGroupId: ID!, $category: String!) {
  elementsByElementGroup(
    elementGroupId: $elementGroupId
    filter: {
      properties: [
        { name: "Category", value: [$category] }
      ]
    }
  ) {
    totalCount
    results {
      id
      name
    }
  }
}

# Variables:
# { "elementGroupId": "{{elementGroupId}}", "category": "Walls" }
```

### Pattern: Elements with Property in Range

```graphql
query GetLargeElements($elementGroupId: ID!, $minArea: String!) {
  elementsByElementGroup(
    elementGroupId: $elementGroupId
    filter: {
      properties: [
        {
          name: "Area",
          valueWithComparator: [
            { value: $minArea, comparator: GREATER_THAN }
          ]
        }
      ]
    }
  ) {
    results {
      id
      name
      properties(filter: { names: ["Area"] }) {
        results {
          displayValue
        }
      }
    }
  }
}

# Variables:
# { "elementGroupId": "{{elementGroupId}}", "minArea": "100" }
```

### Pattern: List Property Definitions in Model

```graphql
query GetPropertyDefinitions($elementGroupId: ID!) {
  propertyDefinitionsByElementGroup(elementGroupId: $elementGroupId) {
    pagination { cursor }
    results {
      id
      name
      description
      specification
      units { name }
      isHidden
    }
  }
}

# Variables:
# { "elementGroupId": "{{elementGroupId}}" }
```

### Pattern: Get Distinct Property Values

```graphql
query GetDistinctValues($elementGroupId: ID!, $propertyName: String!) {
  distinctPropertyValuesInElementGroupByName(
    elementGroupId: $elementGroupId
    name: $propertyName
  ) {
    results {
      definition { name }
      values {
        value
        count
      }
    }
  }
}

# Variables:
# { "elementGroupId": "{{elementGroupId}}", "propertyName": "Category" }
```

---

## Reference Query Patterns

### Pattern: Get Element with All References

```graphql
query GetElementWithReferences($elementId: ID!) {
  elementAtTip(elementId: $elementId) {
    id
    name
    references {
      results {
        name
        displayValue
        value {
          id
          name
        }
      }
    }
  }
}

# Variables:
# { "elementId": "{{elementId}}" }
```

### Pattern: Get Level Reference from Element

```graphql
query GetElementLevel($elementId: ID!) {
  elementAtTip(elementId: $elementId) {
    id
    name
    references(filter: { names: ["Level"] }) {
      results {
        name
        value {
          id
          name
        }
      }
    }
  }
}

# Variables:
# { "elementId": "{{elementId}}" }
```

### Pattern: Elements on a Specific Level

```graphql
query GetElementsOnLevel($elementGroupId: ID!, $levelElementId: String!) {
  elementsByElementGroup(
    elementGroupId: $elementGroupId
    filter: {
      references: [
        { name: "Level", referenceId: [$levelElementId] }
      ]
    }
  ) {
    totalCount
    results {
      id
      name
    }
  }
}

# Variables:
# { "elementGroupId": "{{elementGroupId}}", "levelElementId": "{{levelElementId}}" }
```

### Pattern: Discover All Levels in a Model

> **Always run this before filtering elements by Level.**
> Do not assume level names like "Level 1" or "Ground Floor" exist — level names vary across models.
> Discover levels first, then pick the best match from the results.

```graphql
query DiscoverLevels($elementGroupId: ID!) {
  elementsByElementGroup(
    elementGroupId: $elementGroupId
    filter: {
      properties: [
        { name: "Category", value: ["Levels"] }
      ]
    }
  ) {
    results {
      id
      name
      properties(filter: { names: ["Elevation"] }) {
        results {
          name
          displayValue
        }
      }
    }
  }
}

# Variables:
# { "elementGroupId": "{{elementGroupId}}" }
```

From the results, select the level whose name best matches the user's intent. Use the level's `id` (as a `String`) in subsequent `referenceId` filters.

### Pattern: Elements Referencing a Specific Element (Reverse Lookup)

```graphql
query GetReferencingElements($elementId: ID!, $relationshipName: String!) {
  elementAtTip(elementId: $elementId) {
    id
    name
    referencedBy(name: $relationshipName) {
      totalCount
      results {
        id
        name
      }
    }
  }
}

# Variables:
# { "elementId": "{{levelElementId}}", "relationshipName": "Level" }
```

---

## Version Patterns

### Pattern: Get Model with Version Info

```graphql
query GetModelWithVersion($elementGroupId: ID!) {
  elementGroupAtTip(elementGroupId: $elementGroupId) {
    id
    name
    versionHistory {
      tipVersion {
        versionNumber
        createdOn
        createdBy { userName }
      }
    }
  }
}

# Variables:
# { "elementGroupId": "{{elementGroupId}}" }
```

### Pattern: List All Versions of a Model

```graphql
query GetVersionHistory($elementGroupId: ID!) {
  elementGroupAtTip(elementGroupId: $elementGroupId) {
    name
    versionHistory {
      tipVersion {
        versionNumber
      }
      versions {
        pagination { cursor }
        results {
          versionNumber
          createdOn
          createdBy { userName }
        }
      }
    }
  }
}

# Variables:
# { "elementGroupId": "{{elementGroupId}}" }
```

### Pattern: Get Elements at Specific Version

```graphql
query GetElementsAtVersion($elementGroupId: ID!, $versionNumber: Int!) {
  elementsByElementGroupAtVersion(
    elementGroupId: $elementGroupId
    versionNumber: $versionNumber
  ) {
    totalCount
    results {
      id
      name
    }
  }
}

# Variables:
# { "elementGroupId": "{{elementGroupId}}", "versionNumber": 5 }
```

---

## Combined Patterns

### Pattern: Walls on Level 1 with Area > 100

```graphql
query GetLargeWallsOnLevel($elementGroupId: ID!, $levelElementId: String!) {
  elementsByElementGroup(
    elementGroupId: $elementGroupId
    filter: {
      properties: [
        { name: "Category", value: ["Walls"] },
        {
          name: "Area",
          valueWithComparator: [
            { value: "100", comparator: GREATER_THAN }
          ]
        }
      ]
      references: [
        { name: "Level", referenceId: [$levelElementId] }
      ]
    }
  ) {
    totalCount
    results {
      id
      name
      properties(filter: { names: ["Area"] }) {
        results { displayValue }
      }
    }
  }
}

# Variables:
# { "elementGroupId": "{{elementGroupId}}", "levelElementId": "{{levelElementId}}" }
```

### Pattern: Type Property → Filter Instances (Two-Step)

Use this when the property you need to filter on (e.g. Width, Height) is stored on the **Type**, not on the placed Element/Instance. This requires two queries: first find matching Types, then find Instances that reference those Types.

> **Typing note:** `referenceId` expects `String`, not `ID`.
> Variables used in `referenceId` filters must be declared as `String!` or `[String!]!`.

**Step 1: Query for matching Types (e.g. wide door types)**

Use `filter.query` (RSQL) to find Types where the property meets your threshold:

```graphql
query FindWideDoorTypes($elementGroupId: ID!, $filter: String!) {
  elementsByElementGroup(
    elementGroupId: $elementGroupId
    filter: { query: $filter }
    pagination: { limit: 100 }
  ) {
    results {
      id
      name
      properties(filter: { names: ["Width", "Category"] }) {
        results { name value displayValue }
      }
    }
  }
}

# Variables:
# {
#   "elementGroupId": "{{elementGroupId}}",
#   "filter": "'property.name.category'==Doors and 'property.name.Width' >= 1"
# }
```

**Extract Type IDs from results:** Collect `results[].id` into a list (e.g. `wideTypeIds`).
These type results may not include Level references — that is expected for Types.

**Step 2: Query for placed Instances on a Level, filtered by those Type IDs**

```graphql
query InstancesByTypeOnLevel(
  $elementGroupId: ID!
  $levelId: String!
  $typeIds: [String!]!
) {
  elementsByElementGroup(
    elementGroupId: $elementGroupId
    filter: {
      properties: [{ name: "Category", value: ["Doors"] }]
      references: [
        { name: "Level", referenceId: [$levelId] }
        { name: "Type", referenceId: $typeIds }
      ]
    }
    pagination: { limit: 100 }
  ) {
    totalCount
    results {
      id
      name
      properties(filter: { names: ["Revit Element Id", "Category"] }) {
        results { name value displayValue }
      }
      references(filter: { names: ["Level", "Type"] }) {
        results { name value { id name } }
      }
    }
  }
}

# Variables:
# {
#   "elementGroupId": "{{elementGroupId}}",
#   "levelId": "{{levelElementId}}",
#   "typeIds": ["type-id-1", "type-id-2"]
# }
```

**When to use this pattern:**
- User asks for elements matching a dimensional threshold (e.g. "doors wider than 1m")
- The target property (Width, Height, etc.) lives on the Type, not the Instance
- You need to combine Type-property filtering with Level filtering

### Pattern: Full Element Details

```graphql
query GetFullElementDetails($elementId: ID!) {
  elementAtTip(elementId: $elementId) {
    id
    name
    createdOn
    createdBy { userName email }
    lastModifiedOn
    lastModifiedBy { userName email }
    alternativeIdentifiers {
      externalElementId
      revitElementId
    }
    elementGroup {
      id
      name
      parentFolder { path }
    }
    properties {
      results {
        name
        value
        displayValue
      }
    }
    references {
      results {
        name
        value { id name }
      }
    }
  }
}

# Variables:
# { "elementId": "{{elementId}}" }
```

---

## Query Selection Guide

| I want to... | Use this pattern |
|--------------|------------------|
| List my hubs | List All Hubs |
| See projects in a hub | Hub → Projects |
| Find models in a project | Project → All Models |
| Get elements from a model | Get All Elements from a Model |
| Find elements by category | Elements Filtered by Property Value |
| Find elements on a level | Elements on a Specific Level |
| Get element's properties | Get Specific Properties from Element |
| Find what levels exist | Discover All Levels in a Model |
| See version history | List All Versions of a Model |
| Compare versions | Get Elements at Specific Version |
| Find instances by a Type property (e.g. wide doors) | Type Property → Filter Instances (Two-Step) |

---

## Tips for Adapting Patterns

1. **Start with the simplest pattern** that fits your need
2. **Add filters incrementally** — don't try to build complex queries from scratch
3. **Always include pagination** for lists — use `cursor` for complete results
4. **Test with small limits first** — use `pagination: { limit: 10 }` while developing
5. **Check `totalCount`** to know how many results exist before paginating
6. **Use variables** (`$variableName`) instead of hardcoding values
