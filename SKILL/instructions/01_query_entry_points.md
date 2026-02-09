# AECDM GraphQL — Query Entry Points

This document defines **where queries can begin**. All GraphQL queries must start from one of these root fields on the `Query` type.

> **Do not invent entry points.** If it's not listed here, it doesn't exist.

---

## Entry Points by Domain

### Hub Queries

Hubs are top-level containers for projects and shared resources.

| Field | Parameters | Returns | Use When |
|-------|------------|---------|----------|
| `hub` | `hubId: ID!` | `Hub` | You have a specific Hub ID |
| `hubs` | `filter: HubFilterInput`, `pagination: PaginationInput` | `Hubs` | Listing all accessible hubs or searching by name |
| `hubByDataManagementAPIId` | `dataManagementAPIHubId: ID!` | `Hub` | You have an external/legacy Hub ID from Data Management API |

```graphql
# Example: Get a specific hub
query GetHub($hubId: ID!) {
  hub(hubId: $hubId) {
    id
    name
    projects {
      results { id name }
    }
  }
}
```

---

### Project Queries

Projects are shared workspaces containing folders and design data.

| Field | Parameters | Returns | Use When |
|-------|------------|---------|----------|
| `project` | `projectId: ID!` | `Project` | You have a specific Project ID |
| `projects` | `hubId: ID!`, `filter: ProjectFilterInput`, `pagination: PaginationInput` | `Projects` | Listing projects within a hub |
| `projectByDataManagementAPIId` | `dataManagementAPIProjectId: ID!` | `Project` | You have an external/legacy Project ID |

```graphql
# Example: List projects in a hub
query GetProjects($hubId: ID!) {
  projects(hubId: $hubId) {
    results {
      id
      name
    }
  }
}
```

---

### Folder Queries

Folders organize files within projects.

| Field | Parameters | Returns | Use When |
|-------|------------|---------|----------|
| `folder` | `projectId: ID!`, `folderId: ID!` | `Folder` | You have specific Project and Folder IDs |
| `foldersByFolder` | `projectId: ID!`, `folderId: ID!`, `filter: FolderFilterInput`, `pagination: PaginationInput` | `Folders` | Listing subfolders within a folder |
| `foldersByProject` | `projectId: ID!`, `filter: FolderFilterInput`, `pagination: PaginationInput` | `Folders` | Listing top-level folders in a project |

```graphql
# Example: Get top-level folders in a project
query GetTopFolders($projectId: ID!) {
  foldersByProject(projectId: $projectId) {
    results {
      id
      name
      path
    }
  }
}
```

---

### ElementGroup Queries

ElementGroups represent Revit models. This is typically where you start when querying building data.

| Field | Parameters | Returns | Use When |
|-------|------------|---------|----------|
| `elementGroupAtTip` | `elementGroupId: ID!` | `ElementGroup` | Get latest version of a specific model |
| `elementGroupByVersionNumber` | `elementGroupId: ID!`, `versionNumber: Int!` | `ElementGroup` | Get a specific version of a model |
| `elementGroupsByHub` | `hubId: ID!`, `filter: ElementGroupFilterInput`, `pagination: PaginationInput` | `ElementGroups!` | List all models in a hub |
| `elementGroupsByProject` | `projectId: ID!`, `filter: ElementGroupFilterInput`, `pagination: PaginationInput` | `ElementGroups!` | List all models in a project |
| `elementGroupsByFolder` | `projectId: ID!`, `folderId: ID!`, `filter: ElementGroupFilterInput`, `pagination: PaginationInput` | `ElementGroups!` | List models in a specific folder |
| `elementGroupsByFolderAndSubFolders` | `projectId: ID!`, `folderId: ID!`, `filter: ElementGroupFilterInput`, `pagination: PaginationInput` | `ElementGroups!` | List models in folder + all subfolders recursively |
| `elementGroupExtractionStatus` | `fileUrn: ID!`, `versionNumber: Int = 1` | `ElementGroupExtractionStatus` | Check if model extraction is complete |
| `elementGroupExtractionStatusAtTip` | `fileUrn: ID!`, `accProjectId: ID!` | `ElementGroupExtractionStatus` | Check extraction status for latest version |

```graphql
# Example: Get the latest version of a model
query GetModel($elementGroupId: ID!) {
  elementGroupAtTip(elementGroupId: $elementGroupId) {
    id
    name
    versionHistory {
      tipVersion {
        versionNumber
        createdOn
      }
    }
  }
}
```

---

### Element Queries

Elements are the building components (walls, doors, levels, spaces, etc.).

| Field | Parameters | Returns | Use When |
|-------|------------|---------|----------|
| `elementAtTip` | `elementId: ID!` | `Element` | Get a specific element by ID |
| `elementsByHub` | `hubId: ID!`, `filter: ElementFilterInput`, `pagination: PaginationInput` | `Elements` | Search elements across entire hub |
| `elementsByProject` | `projectId: ID!`, `filter: ElementFilterInput`, `pagination: PaginationInput` | `Elements` | Search elements within a project |
| `elementsByFolder` | `projectId: ID!`, `folderId: ID!`, `filter: ElementFilterInput`, `pagination: PaginationInput` | `Elements` | Search elements within a folder |
| `elementsByElementGroup` | `elementGroupId: ID!`, `filter: ElementFilterInput`, `pagination: PaginationInput` | `Elements` | **Most common** — Get elements from a specific model |
| `elementsByElementGroups` | `elementGroupIds: [ID!]!`, `filter: ElementFilterInput`, `pagination: PaginationInput` | `Elements` | Query across multiple models (max 25) |
| `elementsByElementGroupAtVersion` | `elementGroupId: ID!`, `versionNumber: Int!`, `filter: ElementFilterInput`, `pagination: PaginationInput` | `Elements` | Get elements at a specific model version |

```graphql
# Example: Get all elements from a model with filtering
query GetElements($elementGroupId: ID!, $filter: ElementFilterInput) {
  elementsByElementGroup(elementGroupId: $elementGroupId, filter: $filter) {
    totalCount
    pagination { cursor }
    results {
      id
      name
    }
  }
}
```

---

### Property Definition Queries

Query metadata about properties available in a model.

| Field | Parameters | Returns | Use When |
|-------|------------|---------|----------|
| `propertyDefinitionsByElementGroup` | `elementGroupId: ID!`, `filter: PropertyDefinitionFilterInput`, `pagination: PaginationInput` | `PropertyDefinitions!` | List all property definitions in a model |
| `distinctPropertyValuesInElementGroupById` | `elementGroupId: ID!`, `propertyDefinitionId: ID!`, `filter: ElementFilterInput` | `DistinctPropertyValues` | Get unique values for a property by definition ID |
| `distinctPropertyValuesInElementGroupByName` | `elementGroupId: ID!`, `name: String!`, `filter: ElementFilterInput`, `pagination: PaginationInput` | `DistinctPropertyValuesCollection` | Get unique values for a property by name |

```graphql
# Example: List all property definitions in a model
query GetPropertyDefs($elementGroupId: ID!) {
  propertyDefinitionsByElementGroup(elementGroupId: $elementGroupId) {
    results {
      id
      name
      specification
      units { name }
    }
  }
}

# Example: Get distinct values for "Category" property
query GetDistinctCategories($elementGroupId: ID!) {
  distinctPropertyValuesInElementGroupByName(
    elementGroupId: $elementGroupId
    name: "Category"
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
```

---

## Quick Reference: Choosing an Entry Point

| I want to... | Start with |
|--------------|------------|
| List all my hubs | `hubs` |
| List projects in a hub | `projects(hubId: ...)` |
| List models in a project | `elementGroupsByProject(projectId: ...)` |
| Get elements from a specific model | `elementsByElementGroup(elementGroupId: ...)` |
| Get a single element by ID | `elementAtTip(elementId: ...)` |
| Search elements across a project | `elementsByProject(projectId: ..., filter: ...)` |
| Check what properties exist in a model | `propertyDefinitionsByElementGroup(elementGroupId: ...)` |
| Get unique values for a property | `distinctPropertyValuesInElementGroupByName(...)` |

---

## Subscription Entry Points

For real-time updates (WebSocket):

| Field | Parameters | Returns | Use When |
|-------|------------|---------|----------|
| `elementGroupExtractionStatusByFileUrn` | `input: ElementGroupExtractionByFileUrnInput!` | `ElementGroupExtractionStatus!` | Subscribe to extraction events for a specific file |
| `elementGroupExtractionStatusByProject` | `input: ElementGroupExtractionByProjectInput!` | `ElementGroupExtractionStatus!` | Subscribe to all extraction events in a project |

---

## Anti-Patterns

| Don't Do This | Why It Fails |
|---------------|--------------|
| `elements(...)` at root | No such entry point — use `elementsByElementGroup` |
| `model(...)` or `revitModel(...)` | These don't exist — use `elementGroupAtTip` |
| `levels(...)` at root | Levels are Elements — query them via `elementsByElementGroup` with a filter |
| `properties(...)` at root | Properties are on Elements — query through an Element |
