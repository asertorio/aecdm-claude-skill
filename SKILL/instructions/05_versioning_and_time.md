# AECDM GraphQL — Versioning and Time

This document explains the **version model** for ElementGroups (Revit models).

---

## Key Concepts

### What Gets Versioned

**ElementGroups** (models) are versioned, not individual Elements.

When a Revit model is updated and re-uploaded, a new **version** of the ElementGroup is created. Each version is a complete snapshot of the model at that point in time.

```
ElementGroup (the model)
    │
    └─ versionHistory
        ├─ tipVersion (latest)
        ├─ version 3
        ├─ version 2
        └─ version 1
```

### Core Types

| Type | Purpose |
|------|---------|
| `ElementGroupVersion` | A specific version snapshot |
| `ElementGroupVersionHistory` | Container for all versions of an ElementGroup |
| `tipVersion` | The latest/current version |

---

## Getting the Latest Version

**Most common pattern:** Use `tipVersion` to get the latest data.

### Option 1: Entry point with "AtTip"

```graphql
# Get ElementGroup at its latest version
{
  elementGroupAtTip(elementGroupId: "{{elementGroupId}}") {
    id
    name
    elements {
      results { id name }
    }
  }
}

# Get a single Element at latest version
{
  elementAtTip(elementId: "{{elementId}}") {
    id
    name
  }
}
```

### Option 2: Via versionHistory.tipVersion

```graphql
{
  elementGroupAtTip(elementGroupId: "{{elementGroupId}}") {
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
```

### Option 3: Get elements directly at tip (implicit)

```graphql
# elementsByElementGroup returns elements at the tip version by default
{
  elementsByElementGroup(elementGroupId: "{{elementGroupId}}") {
    results { id name }
  }
}
```

---

## Getting a Specific Version

### Option 1: Entry point with version number

```graphql
{
  elementGroupByVersionNumber(
    elementGroupId: "{{elementGroupId}}"
    versionNumber: 5
  ) {
    name
    version {
      versionNumber
      createdOn
    }
    elements {
      results { id name }
    }
  }
}
```

### Option 2: Via versionHistory.versionByNumber

```graphql
{
  elementGroupAtTip(elementGroupId: "{{elementGroupId}}") {
    versionHistory {
      versionByNumber(versionNumber: 5) {
        versionNumber
        createdOn
        elementGroup {
          name
          elements {
            results { id name }
          }
        }
      }
    }
  }
}
```

### Option 3: Get elements at specific version

```graphql
{
  elementsByElementGroupAtVersion(
    elementGroupId: "{{elementGroupId}}"
    versionNumber: 5
  ) {
    results { id name }
  }
}
```

---

## Listing All Versions

### Basic version list

```graphql
{
  elementGroupAtTip(elementGroupId: "{{elementGroupId}}") {
    name
    versionHistory {
      tipVersion {
        versionNumber  # e.g., 7 (the latest)
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
```

### Filtering versions

Use `ElementGroupVersionFilterInput` to narrow down versions:

```graphql
{
  elementGroupAtTip(elementGroupId: "{{elementGroupId}}") {
    versionHistory {
      versions(
        filter: {
          createdAfter: "2024-01-01T00:00:00Z"
          createdBefore: "2024-06-01T00:00:00Z"
        }
      ) {
        results {
          versionNumber
          createdOn
        }
      }
    }
  }
}
```

**Filter options:**
- `number: Int` — Specific version number
- `createdAfter: DateTime` — Versions created after this time
- `createdBefore: DateTime` — Versions created before this time
- `createdOn: DateTime` — Versions created on this exact time
- `createdBy: ID` — Versions created by a specific user

---

## ElementGroupVersion Fields

```graphql
type ElementGroupVersion {
  versionNumber: Int!       # 1, 2, 3, ...
  createdOn: DateTime       # When this version was created
  createdBy: User           # Who created this version
  elementGroup: ElementGroup  # The ElementGroup at this version
}
```

**Traversing from a version to elements:**

```graphql
{
  elementGroupAtTip(elementGroupId: "{{elementGroupId}}") {
    versionHistory {
      versionByNumber(versionNumber: 3) {
        versionNumber
        createdOn
        elementGroup {
          elements {
            results { id name }
          }
        }
      }
    }
  }
}
```

---

## Common Patterns

### Pattern 1: "Latest only" — Most common

```graphql
query GetLatestElements($elementGroupId: ID!) {
  elementsByElementGroup(elementGroupId: $elementGroupId) {
    totalCount
    results {
      id
      name
    }
  }
}
```

### Pattern 2: "Specific revision" — For historical data

```graphql
query GetElementsAtVersion($elementGroupId: ID!, $version: Int!) {
  elementsByElementGroupAtVersion(
    elementGroupId: $elementGroupId
    versionNumber: $version
  ) {
    results {
      id
      name
    }
  }
}
```

### Pattern 3: "Compare versions" — Version metadata

```graphql
query GetVersionInfo($elementGroupId: ID!) {
  elementGroupAtTip(elementGroupId: $elementGroupId) {
    name
    versionHistory {
      tipVersion {
        versionNumber
        createdOn
      }
      versions {
        results {
          versionNumber
          createdOn
          createdBy { userName }
        }
      }
    }
  }
}
```

### Pattern 4: "Find version by date"

```graphql
query GetVersionsByDate($elementGroupId: ID!, $after: DateTime!, $before: DateTime!) {
  elementGroupAtTip(elementGroupId: $elementGroupId) {
    versionHistory {
      versions(
        filter: {
          createdAfter: $after
          createdBefore: $before
        }
      ) {
        results {
          versionNumber
          createdOn
        }
      }
    }
  }
}
```

---

## When Version Filters Apply

| Query | Version Behavior |
|-------|------------------|
| `elementGroupAtTip` | Always returns latest |
| `elementGroupByVersionNumber` | Returns specified version |
| `elementsByElementGroup` | Returns elements at latest version |
| `elementsByElementGroupAtVersion` | Returns elements at specified version |
| `elementAtTip` | Returns element at its model's latest version |
| `versionHistory.tipVersion` | Reference to latest version |
| `versionHistory.versions` | All versions (filterable) |

---

## Anti-Patterns

| Don't Do This | Why It's Wrong |
|---------------|----------------|
| Assume elements have versions | Only ElementGroups are versioned |
| Use `elementAtVersion(...)` | No such entry point — use `elementsByElementGroupAtVersion` |
| Forget `versionNumber` when you need historical data | You'll get latest by default |
| Over-query versions when you just need latest | Use `AtTip` variants for efficiency |

---

## Quick Decision Guide

| I need... | Use this |
|-----------|----------|
| Latest model data | `elementGroupAtTip` or `elementsByElementGroup` |
| Model at specific version | `elementGroupByVersionNumber` or `elementsByElementGroupAtVersion` |
| Version number of latest | `versionHistory.tipVersion.versionNumber` |
| List of all versions | `versionHistory.versions` |
| Versions in a date range | `versionHistory.versions(filter: {createdAfter, createdBefore})` |
| Who created a version | `version.createdBy` |
