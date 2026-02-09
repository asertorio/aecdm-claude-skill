# AECDM GraphQL — Filters and Inputs

This document explains how to use **filter inputs** correctly to narrow down query results.

---

## Overview

Filters in AECDM GraphQL use input types that end in `FilterInput`. Each filter applies at a specific level in the query hierarchy.

**Key principle:** Apply filters at the right level. A filter on `elementsByElementGroup` affects which elements are returned, not which ElementGroups are selected.

---

## ElementFilterInput

**Used by:** `elementsByHub`, `elementsByProject`, `elementsByFolder`, `elementsByElementGroup`, `elementsByElementGroups`, `elementsByElementGroupAtVersion`, `Element.referencedBy`

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `query` | `String` | RSQL filter query string |
| `name` | `[String!]` | Filter by exact element names |
| `nameWithComparator` | `[ValueComparatorInput!]` | Filter names with comparators (contains, starts with, etc.) |
| `properties` | `[ElementPropertyFilterInput!]` | Filter by property values |
| `references` | `[ElementReferenceFilterInput!]` | Filter by references to other elements |
| `createdBy` | `[String!]` | Filter by creator's email |
| `lastModifiedBy` | `[String!]` | Filter by last modifier's email |
| `elementId` | `[String!]` | Filter by element IDs |
| `revitElementId` | `[String!]` | Filter by Revit element IDs |

### Examples

**Filter by exact name:**
```graphql
{
  elementsByElementGroup(
    elementGroupId: "{{elementGroupId}}"
    filter: { name: ["Wall", "Door", "Window"] }
  ) {
    results { id name }
  }
}
```

**Filter by name pattern:**
```graphql
{
  elementsByElementGroup(
    elementGroupId: "{{elementGroupId}}"
    filter: {
      nameWithComparator: [
        { value: "Level", comparator: STARTS_WITH }
      ]
    }
  ) {
    results { id name }
  }
}
```

**Filter by property value:**
```graphql
{
  elementsByElementGroup(
    elementGroupId: "{{elementGroupId}}"
    filter: {
      properties: [
        { name: "Category", value: ["Walls"] }
      ]
    }
  ) {
    results { id name }
  }
}
```

**Filter by reference (elements on a specific Level):**
```graphql
{
  elementsByElementGroup(
    elementGroupId: "{{elementGroupId}}"
    filter: {
      references: [
        { name: "Level", referenceId: ["{{levelElementId}}"] }
      ]
    }
  ) {
    results { id name }
  }
}
```

**Filter by multiple criteria (AND logic):**
```graphql
{
  elementsByElementGroup(
    elementGroupId: "{{elementGroupId}}"
    filter: {
      properties: [
        { name: "Category", value: ["Walls"] }
      ]
      references: [
        { name: "Level", referenceId: ["{{levelElementId}}"] }
      ]
    }
  ) {
    results { id name }
  }
}
```

---

## RSQL Query Filter (`query` field)

The `query` field on `ElementFilterInput` accepts an RSQL filter string for property-based filtering. This is the preferred approach when you need comparison operators (greater than, less than, etc.) or complex multi-property combinations.

### Property Path Syntax

Access property values using: `property.name.<propertyName>`

**Always wrap property paths in single quotes.** This is required when property names contain special characters or mixed case, and is safe to always use as a default:

```
'property.name.category'==Walls
'property.name.Length' > 2
```

### Combining Filters

Use `and` / `or` to combine conditions:

```
'property.name.category'==Walls and 'property.name.Length' > 2
'property.name.category'==Doors and 'property.name.Width' >= 0.9 and 'property.name.Height' >= 2.1
'property.name.category'==Walls or 'property.name.category'==Doors
```

### GraphQL Usage

Pass the RSQL string via the `query` field in `ElementFilterInput`:

```graphql
query GetFilteredElements($elementGroupId: ID!, $filter: String!) {
  elementsByElementGroup(elementGroupId: $elementGroupId, filter: {query: $filter}) {
    results {
      id
      name
      properties {
        results { name value displayValue }
      }
    }
  }
}
```

Variables:
```json
{
  "elementGroupId": "{{elementGroupId}}",
  "filter": "'property.name.category'==Walls and 'property.name.Length' > 2"
}
```

---

## ElementPropertyFilterInput

**Used by:** `ElementFilterInput.properties`

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String` | Property name to filter on |
| `id` | `String` | Property definition ID |
| `value` | `[String!]` | Exact values to match (OR logic within array) |
| `valueWithComparator` | `[ValueComparatorInput!]` | Values with comparators |

### Examples

**Exact value match:**
```graphql
filter: {
  properties: [
    { name: "Category", value: ["Walls", "Doors"] }  # Walls OR Doors
  ]
}
```

**Numeric comparison:**
```graphql
filter: {
  properties: [
    {
      name: "Area",
      valueWithComparator: [
        { value: "100", comparator: GREATER_THAN }
      ]
    }
  ]
}
```

**String pattern:**
```graphql
filter: {
  properties: [
    {
      name: "Mark",
      valueWithComparator: [
        { value: "W-", comparator: STARTS_WITH }
      ]
    }
  ]
}
```

---

## ElementReferenceFilterInput

**Used by:** `ElementFilterInput.references`

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` | Reference name (e.g., "Level", "Space") |
| `referenceId` | `[String!]!` | Element IDs that should be referenced |

> **Important typing note:** `referenceId` expects **`String`**, not `ID`.
> When declaring GraphQL variables for use in `referenceId`, always use `String!` or `[String!]!`.
> Using `ID!` will cause type errors at runtime.
>
> Correct: `$levelId: String!`, `$typeIds: [String!]!`
> Wrong: `$levelId: ID!`, `$typeIds: [ID!]!`

### Examples

**Elements on a specific Level:**
```graphql
filter: {
  references: [
    { name: "Level", referenceId: ["{{levelElementId}}"] }
  ]
}
```

**Elements in specific Spaces:**
```graphql
filter: {
  references: [
    { name: "Space", referenceId: ["{{space1Id}}", "{{space2Id}}"] }
  ]
}
```

**Elements filtered by multiple references (Level + Type):**

You can combine multiple reference filters in the same `references` array. This is useful when filtering instances by both their Level and their Type (e.g. after collecting Type IDs from a prior query):

```graphql
filter: {
  properties: [{ name: "Category", value: ["Doors"] }]
  references: [
    { name: "Level", referenceId: [$levelId] }
    { name: "Type", referenceId: $typeIds }
  ]
}

# Variable declarations (note: String, not ID):
# $levelId: String!
# $typeIds: [String!]!
```

---

## ElementGroupFilterInput

**Used by:** `elementGroupsByHub`, `elementGroupsByProject`, `elementGroupsByFolder`, `elementGroupsByFolderAndSubFolders`, `Project.elementGroups`, `Folder.elementGroups`

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `query` | `String` | RSQL filter query string |
| `name` | `[String!]` | Filter by exact model names |
| `createdBy` | `[String!]` | Filter by creator's email |
| `lastModifiedBy` | `[String!]` | Filter by last modifier's email |
| `fileUrn` | `[String!]` | Filter by file URN |

### Examples

**Filter by model name:**
```graphql
{
  elementGroupsByProject(
    projectId: "{{projectId}}"
    filter: { name: ["Architectural Model", "Structural Model"] }
  ) {
    results { id name }
  }
}
```

**Filter by creator:**
```graphql
{
  elementGroupsByProject(
    projectId: "{{projectId}}"
    filter: { createdBy: ["architect@example.com"] }
  ) {
    results { id name }
  }
}
```

---

## ElementGroupVersionFilterInput

**Used by:** `ElementGroupVersionHistory.versions`

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `number` | `Int` | Specific version number |
| `createdAfter` | `DateTime` | Versions created after this time |
| `createdBefore` | `DateTime` | Versions created before this time |
| `createdOn` | `DateTime` | Versions created at this exact time |
| `createdBy` | `ID` | Versions created by this user ID |

### Examples

**Versions in date range:**
```graphql
{
  elementGroupAtTip(elementGroupId: "{{elementGroupId}}") {
    versionHistory {
      versions(
        filter: {
          createdAfter: "2024-01-01T00:00:00Z"
          createdBefore: "2024-12-31T23:59:59Z"
        }
      ) {
        results { versionNumber createdOn }
      }
    }
  }
}
```

---

## PropertyFilterInput

**Used by:** `Element.properties`

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `names` | `[String!]!` | Property names to return |

### Examples

**Get specific properties:**
```graphql
{
  elementAtTip(elementId: "{{elementId}}") {
    properties(filter: { names: ["Area", "Volume", "Mark"] }) {
      results {
        name
        value
        displayValue
      }
    }
  }
}
```

---

## PropertyDefinitionFilterInput

**Used by:** `propertyDefinitionsByElementGroup`, `ElementGroup.propertyDefinitions`, `PropertyDefinitionCollection.definitions`

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `names` | `[String!]` | Property definition names |

### Examples

```graphql
{
  propertyDefinitionsByElementGroup(
    elementGroupId: "{{elementGroupId}}"
    filter: { names: ["Area", "Volume"] }
  ) {
    results { id name specification }
  }
}
```

---

## ReferencePropertyFilterInput

**Used by:** `Element.references`

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `names` | `[String!]` | Reference names to return |

### Examples

**Get Level and Space references:**
```graphql
{
  elementAtTip(elementId: "{{elementId}}") {
    references(filter: { names: ["Level", "Space"] }) {
      results {
        name
        value { id name }
      }
    }
  }
}
```

---

## Simple Filters (Name Only)

These filters support only name-based filtering:

| Filter | Used By | Field |
|--------|---------|-------|
| `HubFilterInput` | `hubs` | `name: String` |
| `ProjectFilterInput` | `projects`, `Hub.projects` | `name: String` |
| `FolderFilterInput` | `foldersByFolder`, `foldersByProject`, `Folder.folders` | `name: String` |

### Examples

```graphql
{
  hubs(filter: { name: "My Organization" }) {
    results { id name }
  }
}

{
  projects(hubId: "{{hubId}}", filter: { name: "Building A" }) {
    results { id name }
  }
}
```

---

## ValueComparatorInput and Comparators

**Fields:**
- `value: String!` — The value to compare
- `comparator: Comparators` — How to compare

**Comparators enum:**

| Value | Description |
|-------|-------------|
| `CASE_SENSITIVE` | Exact match, case sensitive |
| `CONTAINS` | Value contains the string |
| `STARTS_WITH` | Value starts with the string |
| `ENDS_WITH` | Value ends with the string |
| `GREATER_THAN` | Value > comparison |
| `LESS_THAN` | Value < comparison |
| `GREATER_THAN_EQUAL_TO` | Value >= comparison |
| `LESS_THAN_EQUAL_TO` | Value <= comparison |
| `NOT_EQUAL` | Value != comparison |

### Examples

```graphql
# Names containing "Wall"
filter: {
  nameWithComparator: [
    { value: "Wall", comparator: CONTAINS }
  ]
}

# Area greater than 100
filter: {
  properties: [
    {
      name: "Area",
      valueWithComparator: [
        { value: "100", comparator: GREATER_THAN }
      ]
    }
  ]
}
```

---

## PaginationInput

**Used by:** Nearly all list queries

**Fields:**
- `cursor: String` — Page cursor (from previous response)
- `limit: Int` — Maximum items per page

### Examples

```graphql
# First page
{
  elementsByElementGroup(
    elementGroupId: "{{elementGroupId}}"
    pagination: { limit: 100 }
  ) {
    pagination {
      cursor    # Use this for next page
      pageSize
    }
    results { id name }
  }
}

# Next page
{
  elementsByElementGroup(
    elementGroupId: "{{elementGroupId}}"
    pagination: {
      cursor: "{{cursorFromPreviousResponse}}"
      limit: 100
    }
  ) {
    pagination { cursor }
    results { id name }
  }
}
```

---

## Filter Level Matrix

| Filter Type | Where It Applies | What It Filters |
|-------------|------------------|-----------------|
| `HubFilterInput` | `hubs` query | Which hubs are returned |
| `ProjectFilterInput` | `projects`, `Hub.projects` | Which projects are returned |
| `FolderFilterInput` | `foldersByFolder`, etc. | Which folders are returned |
| `ElementGroupFilterInput` | `elementGroupsBy*` | Which models are returned |
| `ElementFilterInput` | `elementsBy*` | Which elements are returned |
| `ElementGroupVersionFilterInput` | `versionHistory.versions` | Which versions are returned |
| `PropertyFilterInput` | `Element.properties` | Which properties are returned |
| `ReferencePropertyFilterInput` | `Element.references` | Which references are returned |

---

## Anti-Patterns

| Don't Do This | Why It Fails |
|---------------|--------------|
| `elementsByElementGroup(filter: { level: "..." })` | `level` is not a valid filter field — use `references` |
| Filtering by name at wrong level | `elementGroupsByProject(filter: { name: "Wall" })` filters models, not elements |
| Using `name` filter when you need `properties` | Names are element names, not property values |
| Forgetting pagination on large datasets | Default limits apply; use cursor for complete results |
| Using `GREATER_THAN` with non-numeric strings | Comparators are type-sensitive |
