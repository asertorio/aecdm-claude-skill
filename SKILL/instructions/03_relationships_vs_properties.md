# AECDM GraphQL — Relationships vs Properties

> **This is a critical document.** Misunderstanding this distinction causes most query errors.

---

## The Three Categories of Element Fields

When working with an `Element`, its data falls into three distinct categories:

| Category | What It Is | How to Access | Example Fields |
|----------|-----------|---------------|----------------|
| **Scalar Fields** | Direct values on the Element type | `element.fieldName` | `id`, `name`, `createdOn` |
| **Properties** | Dynamic metadata (parameters) | `element.properties(filter)` | Area, Volume, Mark, Comments |
| **References** | Relationships to other Elements | `element.references(filter)` | Level, Space, Room, Type |

---

## Scalar Fields

Scalar fields are **direct values** defined on the `Element` type in the schema. They're always available and accessed directly.

**Available scalar fields on Element:**
- `id: ID!` — Unique identifier
- `name: String!` — Element name
- `createdBy: User` — User who created the element
- `createdOn: DateTime` — Creation timestamp
- `lastModifiedBy: User` — Last modifier
- `lastModifiedOn: DateTime` — Last modification timestamp

**How to query:**
```graphql
{
  elementAtTip(elementId: "{{elementId}}") {
    id              # Scalar
    name            # Scalar
    createdOn       # Scalar
    createdBy {     # Nested object (User), but accessed directly
      userName
      email
    }
  }
}
```

**Key point:** These fields exist on every Element and are accessed without filters.

---

## Properties (Dynamic Metadata)

Properties are **dynamic parameters** attached to elements — things like Area, Volume, Mark, custom Revit parameters, etc.

**Characteristics:**
- Accessed via `element.properties(filter: PropertyFilterInput)`
- Returns a `Properties` object with `results: [Property]`
- Each `Property` has: `name`, `value`, `displayValue`, `definition`
- Different elements can have different properties
- Properties are metadata, not relationships

**How to query:**
```graphql
{
  elementAtTip(elementId: "{{elementId}}") {
    name
    properties {
      results {
        name          # e.g., "Area"
        value         # The raw value
        displayValue  # Formatted string (e.g., "150.5 SF")
        definition {
          name
          specification  # Data type
          units { name }
        }
      }
    }
  }
}
```

**Filtering properties:**
```graphql
{
  elementAtTip(elementId: "{{elementId}}") {
    # Only get specific properties
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

**Common properties you might query:**
- Area, Volume, Perimeter (dimensions)
- Mark, Comments (identification)
- Material, Finish (specifications)
- Custom parameters defined in Revit

---

## References (Relationships to Other Elements)

References are **relationships** between elements — connections to other Element objects like Levels, Spaces, Rooms, or Types.

**Characteristics:**
- Accessed via `element.references(filter: ReferencePropertyFilterInput)`
- Returns a `ReferenceProperties` object with `results: [ReferenceProperty]`
- Each `ReferenceProperty` has: `name`, `value` (which is an `Element`!), `displayValue`, `definition`
- The `value` field returns the **actual referenced Element**, not a string

**How to query:**
```graphql
{
  elementAtTip(elementId: "{{elementId}}") {
    name
    references {
      results {
        name          # e.g., "Level"
        displayValue  # e.g., "Level 1"
        value {       # This is an Element!
          id
          name        # "Level 1"
          properties {
            results { name value }
          }
        }
      }
    }
  }
}
```

**Filtering references:**
```graphql
{
  elementAtTip(elementId: "{{elementId}}") {
    # Only get Level and Space references
    references(filter: { names: ["Level", "Space"] }) {
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

**Common references you might query:**
- **Level** — Which level the element is on
- **Space** — Which space contains the element
- **Room** — Which room the element is in
- **Type** — The element's type definition
- **Host** — What the element is hosted by

---

## The Level Confusion — A Case Study

**The #1 mistake:** Treating Level as a property or scalar field.

### ❌ Wrong Approaches

```graphql
# WRONG: Level is not a scalar field
{
  elementAtTip(elementId: "...") {
    name
    level    # ERROR: Field "level" doesn't exist
  }
}

# WRONG: Level is not in properties
{
  elementAtTip(elementId: "...") {
    properties(filter: { names: ["Level"] }) {
      results { name value }  # Will be empty or wrong
    }
  }
}

# WRONG: Cannot filter elements by level name directly
{
  elementsByElementGroup(
    elementGroupId: "..."
    filter: { level: "Level 1" }  # ERROR: Invalid filter
  ) {
    results { name }
  }
}
```

### ✅ Correct Approach

```graphql
# CORRECT: Level is a reference to another Element
{
  elementAtTip(elementId: "...") {
    name
    references(filter: { names: ["Level"] }) {
      results {
        name          # "Level"
        displayValue  # "Level 1"
        value {       # The actual Level element
          id
          name        # "Level 1"
        }
      }
    }
  }
}
```

### Filtering Elements by Level

To find elements on a specific level, use the `references` filter in `ElementFilterInput`:

```graphql
{
  elementsByElementGroup(
    elementGroupId: "{{elementGroupId}}"
    filter: {
      references: [{
        name: "Level"
        referenceId: ["{{levelElementId}}"]  # The Level's element ID
      }]
    }
  ) {
    results {
      id
      name
    }
  }
}
```

**Note:** You need the Level's element ID, not its name. **Never assume a level name like "Level 1" or "Ground Floor" exists** — level names vary across models. Always discover levels first, then pick by best match:

```graphql
# Step 1: Discover all levels in the model
{
  elementsByElementGroup(
    elementGroupId: "{{elementGroupId}}"
    filter: {
      properties: [{ name: "Category", value: ["Levels"] }]
    }
  ) {
    results {
      id    # Use this ID for filtering
      name  # Pick the best match from these results
    }
  }
}
```

From the results, select the level whose name best matches the user's intent (e.g. "Level 1", "Ground Floor", "01 - Entry Level").

---

## The Type Confusion — Properties on Types vs Instances

**The #2 mistake:** Assuming a property (e.g. Width, Height) lives on the placed Instance when it actually lives on the **Type**.

In Revit-sourced models, many dimensional and specification properties are defined on the **Type element**, not on each placed instance. For example:
- A door's **Width** and **Height** are typically properties of the door **Type**
- The placed door **Instance** references that Type but does not duplicate those properties

### Why This Matters for Queries

If you query placed door instances and filter by `Width >= 1`, you may get **zero results** — not because no wide doors exist, but because `Width` is stored on the Type, not the Instance.

### Correct Approach: Two-Step Query

1. **Query Types** — Use `filter.query` (RSQL) to find Type elements where the property meets your threshold (e.g. `'property.name.Width' >= 1`)
2. **Collect Type IDs** — Extract `results[].id` from the Type query
3. **Query Instances** — Filter placed elements by `references: [{ name: "Type", referenceId: $typeIds }]`, optionally combined with a Level reference filter

> See `07_query_patterns.md` → "Type Property → Filter Instances (Two-Step)" for complete query templates.

### Quick Example

```
Step 1: Find door Types with Width >= 1
        → Returns Type IDs: ["type-a", "type-b"]

Step 2: Find door Instances on Level 1 that reference those Types
        → filter: {
            properties: [{ name: "Category", value: ["Doors"] }],
            references: [
              { name: "Level", referenceId: [$levelId] },
              { name: "Type", referenceId: ["type-a", "type-b"] }
            ]
          }
```

### Warning Signs

| If you're trying to... | Stop and reconsider |
|------------------------|---------------------|
| Filter instances by Width, Height, or similar | The property likely lives on the Type — use the two-step pattern |
| Getting zero results for a property filter you expect to match | Check whether the property is on the Type rather than the Instance |

---

## Reverse References: `referencedBy`

When you have an element (like a Level) and want to find all elements that reference it:

```graphql
{
  elementAtTip(elementId: "{{levelElementId}}") {
    name  # "Level 1"
    referencedBy(name: "Level") {
      results {
        id
        name  # Elements on this level
      }
    }
  }
}
```

The `name` parameter specifies the relationship name to look up.

---

## Quick Reference Table

| I want to get... | Category | Access Pattern |
|-----------------|----------|----------------|
| Element's unique ID | Scalar | `element.id` |
| Element's name | Scalar | `element.name` |
| When element was created | Scalar | `element.createdOn` |
| Element's area or volume | Property | `element.properties(filter: {names: ["Area"]})` |
| Element's mark or comments | Property | `element.properties(filter: {names: ["Mark"]})` |
| What level the element is on | Reference | `element.references(filter: {names: ["Level"]})` |
| What space contains the element | Reference | `element.references(filter: {names: ["Space"]})` |
| Element's type | Reference | `element.references(filter: {names: ["Type"]})` |
| All elements on a level | Reverse Ref | `levelElement.referencedBy(name: "Level")` |

---

## Decision Flowchart

```
Is it one of: id, name, createdOn, createdBy, lastModifiedOn, lastModifiedBy?
    │
    ├─ YES → It's a SCALAR → Access directly: element.fieldName
    │
    └─ NO → Is it a measurement, parameter, or metadata value (Area, Volume, Mark)?
            │
            ├─ YES → It's a PROPERTY → Use: element.properties(filter: {names: [...]})
            │
            └─ NO → Is it a relationship to another element (Level, Space, Type, Room)?
                    │
                    ├─ YES → It's a REFERENCE → Use: element.references(filter: {names: [...]})
                    │
                    └─ NO → Check ref_* docs for the actual field name
```

---

## Warning Signs You're Confused

| If you're trying to... | Stop and reconsider |
|------------------------|---------------------|
| Access `element.level` | Level is a reference, use `element.references` |
| Filter by `level: "Level 1"` | You need to filter by Level element ID via `references` filter |
| Get Level from `properties` | Level is a reference, not a property |
| Access `element.category` | Check if this is a property or doesn't exist |
| Use a field that's not in the schema | Always verify against `ref_*` docs |
