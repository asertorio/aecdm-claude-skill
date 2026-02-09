# AECDM GraphQL — Start Here

> **Read this document first.** It prevents 80% of common query mistakes.

---

## How AECDM GraphQL Works

AECDM (AEC Data Model) is Autodesk's GraphQL API for querying building information models. The data is organized in a clear hierarchy:

```
Hub
 └─ Project
     └─ Folder
         └─ ElementGroup (represents a Revit model)
             └─ Element (walls, doors, windows, levels, spaces, etc.)
                 ├─ properties (dynamic metadata like "Area", "Volume")
                 └─ references (relationships to other Elements)
```

**Key concept:** You traverse this hierarchy to reach the data you need. You cannot skip levels or invent shortcuts.

---

## Critical Rules

### 1. Relationships Are References, Not Scalar Fields

**Wrong thinking:** "Level is a property of an element, so I'll filter by `level: 'Level 1'`"

**Correct thinking:** "Level is another Element that my element *references*. I need to query the `references` field."

```graphql
# CORRECT: Query the Level reference
{
  elementsByElementGroup(elementGroupId: "{{elementGroupId}}") {
    results {
      name
      references(filter: { names: ["Level"] }) {
        results {
          name
          value {
            id
            name  # This is the Level's name, e.g., "Level 1"
          }
        }
      }
    }
  }
}
```

### 2. Access Elements Through ElementGroup

Most queries for building elements go through an `ElementGroup` (which represents a Revit model file):

```graphql
# Get elements from a specific model
{
  elementsByElementGroup(elementGroupId: "{{elementGroupId}}") {
    results {
      id
      name
    }
  }
}
```

Or traverse from the ElementGroup itself:

```graphql
{
  elementGroupAtTip(elementGroupId: "{{elementGroupId}}") {
    name
    elements {
      results {
        id
        name
      }
    }
  }
}
```

### 3. Use `tipVersion` for Latest Data

ElementGroups have versions. To get the latest version, use:
- `elementGroupAtTip(elementGroupId)` — returns the ElementGroup at its latest version
- `versionHistory.tipVersion` — when traversing from an ElementGroup

```graphql
{
  elementGroupAtTip(elementGroupId: "{{elementGroupId}}") {
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

### 4. Properties vs References vs Scalar Fields

| Type | What It Is | How to Access |
|------|-----------|---------------|
| **Scalar** | Direct value on the type | `element.name`, `element.id` |
| **Property** | Dynamic metadata (Area, Volume, custom params) | `element.properties(filter: {names: ["Area"]})` |
| **Reference** | Relationship to another Element (Level, Space, Type) | `element.references(filter: {names: ["Level"]})` |

**See `03_relationships_vs_properties.md` for detailed guidance.**

---

## Canonical Query Skeletons

### Skeleton 1: Get Elements from a Model

```graphql
query GetElements($elementGroupId: ID!) {
  elementsByElementGroup(elementGroupId: $elementGroupId) {
    totalCount
    pagination { cursor pageSize }
    results {
      id
      name
      # Add properties, references as needed
    }
  }
}
```

### Skeleton 2: Navigate Hub → Project → ElementGroups

```graphql
query NavigateToModels($hubId: ID!) {
  hub(hubId: $hubId) {
    name
    projects {
      results {
        id
        name
        elementGroups {
          results {
            id
            name
          }
        }
      }
    }
  }
}
```

### Skeleton 3: Get Element with Properties and References

```graphql
query GetElementDetails($elementId: ID!) {
  elementAtTip(elementId: $elementId) {
    id
    name
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
        value {
          id
          name
        }
      }
    }
  }
}
```

---

## Explicit Warnings

| Mistake | Reality |
|---------|---------|
| ❌ `element.level` | Level is not a scalar field |
| ❌ `filter: { level: "Level 1" }` | You cannot filter by Level name directly at the element level |
| ❌ Inventing fields like `element.category` | Check `ref_*` docs for actual field names |
| ❌ Assuming `properties` contains Level | Level is a **reference**, not a property |
| ❌ Using `elements` without going through ElementGroup | Elements live inside ElementGroups |

---

## Troubleshooting

### "Field doesn't exist"
→ Retrieve the relevant `ref_*` doc and verify the exact field name and its parent type. GraphQL is case-sensitive and fields must exist on the type you're querying.

### "Empty results"
→ Check these in order:
1. **Filters**: Are your filter values correct? Is the RSQL syntax valid?
2. **Version selection**: Are you querying the right version? Use `elementGroupAtTip` for latest.
3. **Permissions**: Does your token have access to this Hub/Project/ElementGroup?
4. **Pagination**: Did you check if there are more pages via `pagination.cursor`?

### "Level confusion"
→ Go to `03_relationships_vs_properties.md`. Level is a **reference** to another Element, not a property or scalar field. You must query it through `element.references(filter: {names: ["Level"]})`.

---

## Next Steps

1. **01_query_entry_points.md** — Learn all available Query entry points
2. **02_core_object_model.md** — Understand the object hierarchy in depth
3. **03_relationships_vs_properties.md** — Master the critical distinction (read this!)
