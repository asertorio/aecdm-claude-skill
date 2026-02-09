# AECDM GraphQL — Property System

This document explains the **property system** — how dynamic metadata is structured, queried, and filtered.

---

## Overview

Properties in AECDM are dynamic metadata attached to elements — things like Area, Volume, Mark, custom Revit parameters, etc. They are **not** the same as scalar fields or references.

**Key types:**
- `Property` — An actual property value on an element
- `PropertyDefinition` — Template/metadata about a property (name, data type, units)
- `PropertyDefinitionCollection` — A group of property definitions

---

## Property Type

**What it represents:** A single property value attached to an element.

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` | Human-readable name (e.g., "Area") |
| `value` | `PropertyValue` | The raw value (scalar type varies) |
| `displayValue` | `String` | Formatted string (e.g., "150.5 SF") |
| `definition` | `PropertyDefinition!` | Metadata about this property |

**Querying properties on an element:**

```graphql
{
  elementAtTip(elementId: "{{elementId}}") {
    name
    properties {
      results {
        name          # "Area"
        value         # 150.5
        displayValue  # "150.5 SF"
        definition {
          id
          name
          specification  # Data type
          units { name } # "Square Feet"
        }
      }
    }
  }
}
```

**Filtering to specific properties:**

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

## PropertyDefinition Type

**What it represents:** A template that defines what a property is — its name, data type, units, and behavior.

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `ID!` | Unique identifier |
| `name` | `String!` | Property name |
| `description` | `String` | Description of the property |
| `specification` | `String` | Data type specification |
| `units` | `Units` | Unit of measurement |
| `isHidden` | `Boolean` | Hidden in application UI |
| `isReadOnly` | `Boolean` | Read-only in application |
| `isArchived` | `Boolean` | Archived/deprecated |
| `shouldCopy` | `Boolean` | Copied on document copy operations |
| `collection` | `PropertyDefinitionCollection` | Parent collection |

**Querying property definitions in a model:**

```graphql
{
  propertyDefinitionsByElementGroup(elementGroupId: "{{elementGroupId}}") {
    results {
      id
      name
      description
      specification
      units {
        id
        name
      }
      isHidden
      isReadOnly
    }
  }
}
```

**Filtering property definitions:**

```graphql
{
  propertyDefinitionsByElementGroup(
    elementGroupId: "{{elementGroupId}}"
    filter: { names: ["Area", "Volume"] }
  ) {
    results {
      id
      name
      specification
    }
  }
}
```

**Via ElementGroup:**

```graphql
{
  elementGroupAtTip(elementGroupId: "{{elementGroupId}}") {
    propertyDefinitions {
      results {
        id
        name
      }
    }
  }
}
```

---

## PropertyDefinitionCollection Type

**What it represents:** A grouping of property definitions — often representing a parameter group or shared parameter set.

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `ID!` | Unique identifier |
| `name` | `String` | Collection name |
| `description` | `String` | Collection description |
| `definitions` | `PropertyDefinitions` | Property definitions in this collection |

**Querying definitions within a collection:**

```graphql
# Via a PropertyDefinition
{
  propertyDefinitionsByElementGroup(elementGroupId: "{{elementGroupId}}") {
    results {
      name
      collection {
        id
        name
        description
      }
    }
  }
}
```

---

## Distinct Property Values

To discover what values exist for a property across elements in a model:

### By property name

```graphql
{
  distinctPropertyValuesInElementGroupByName(
    elementGroupId: "{{elementGroupId}}"
    name: "Category"
  ) {
    results {
      definition {
        name
        id
      }
      values {
        value   # The distinct value
        count   # How many elements have this value
      }
    }
  }
}
```

### By property definition ID

```graphql
{
  distinctPropertyValuesInElementGroupById(
    elementGroupId: "{{elementGroupId}}"
    propertyDefinitionId: "{{propertyDefinitionId}}"
  ) {
    definition {
      name
    }
    values(limit: 100) {  # Default 200, max 2000
      value
      count
    }
  }
}
```

### With element filtering

```graphql
{
  distinctPropertyValuesInElementGroupByName(
    elementGroupId: "{{elementGroupId}}"
    name: "Material"
    filter: {
      properties: [
        { name: "Category", value: ["Walls"] }
      ]
    }
  ) {
    results {
      values {
        value
        count
      }
    }
  }
}
```

---

## Filtering Elements by Property Values

Use `ElementFilterInput.properties` to filter elements based on their property values:

### Exact value match

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

### Multiple values (OR within same property)

```graphql
{
  elementsByElementGroup(
    elementGroupId: "{{elementGroupId}}"
    filter: {
      properties: [
        { name: "Category", value: ["Walls", "Doors", "Windows"] }
      ]
    }
  ) {
    results { id name }
  }
}
```

### Multiple properties (AND between properties)

```graphql
{
  elementsByElementGroup(
    elementGroupId: "{{elementGroupId}}"
    filter: {
      properties: [
        { name: "Category", value: ["Walls"] },
        { name: "Function", value: ["Exterior"] }
      ]
    }
  ) {
    results { id name }
  }
}
```

### With comparators

```graphql
{
  elementsByElementGroup(
    elementGroupId: "{{elementGroupId}}"
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
  ) {
    results { id name }
  }
}
```

### By property definition ID

```graphql
{
  elementsByElementGroup(
    elementGroupId: "{{elementGroupId}}"
    filter: {
      properties: [
        { id: "{{propertyDefinitionId}}", value: ["SomeValue"] }
      ]
    }
  ) {
    results { id name }
  }
}
```

---

## Including Reference Properties

The `includeReferencesProperties` parameter allows querying properties from referenced elements:

```graphql
{
  elementAtTip(elementId: "{{elementId}}") {
    properties(includeReferencesProperties: "Type") {
      results {
        name
        value
        displayValue
      }
    }
  }
}
```

This includes properties from the element's Type reference.

---

## Property vs PropertyDefinition

| Aspect | Property | PropertyDefinition |
|--------|----------|-------------------|
| **What it is** | Actual value on an element | Template/metadata |
| **Contains** | name, value, displayValue | name, specification, units |
| **Where found** | `element.properties` | `propertyDefinitionsByElementGroup`, `elementGroup.propertyDefinitions` |
| **Per element** | Yes — each element has its own property values | No — definitions are shared across elements |

---

## Common Patterns

### Pattern 1: List all available properties in a model

```graphql
query ListProperties($elementGroupId: ID!) {
  propertyDefinitionsByElementGroup(elementGroupId: $elementGroupId) {
    results {
      id
      name
      specification
      units { name }
    }
  }
}
```

### Pattern 2: Get specific properties from an element

```graphql
query GetElementProperties($elementId: ID!) {
  elementAtTip(elementId: $elementId) {
    name
    properties(filter: { names: ["Area", "Volume", "Mark", "Comments"] }) {
      results {
        name
        value
        displayValue
      }
    }
  }
}
```

### Pattern 3: Find elements with specific property values

```graphql
query FindByProperty($elementGroupId: ID!, $category: String!) {
  elementsByElementGroup(
    elementGroupId: $elementGroupId
    filter: {
      properties: [{ name: "Category", value: [$category] }]
    }
  ) {
    totalCount
    results {
      id
      name
    }
  }
}
```

### Pattern 4: Discover unique values for a property

```graphql
query GetCategories($elementGroupId: ID!) {
  distinctPropertyValuesInElementGroupByName(
    elementGroupId: $elementGroupId
    name: "Category"
  ) {
    results {
      values {
        value
        count
      }
    }
  }
}
```

### Pattern 5: Elements with properties in a range

```graphql
query LargeWalls($elementGroupId: ID!) {
  elementsByElementGroup(
    elementGroupId: $elementGroupId
    filter: {
      properties: [
        { name: "Category", value: ["Walls"] },
        {
          name: "Area",
          valueWithComparator: [
            { value: "500", comparator: GREATER_THAN }
          ]
        }
      ]
    }
  ) {
    results {
      id
      name
      properties(filter: { names: ["Area"] }) {
        results { displayValue }
      }
    }
  }
}
```

---

## Anti-Patterns

| Don't Do This | Why It Fails |
|---------------|--------------|
| `element.Area` | Properties aren't scalar fields — use `element.properties` |
| Assume all elements have the same properties | Different element types have different properties |
| Filter by property without checking it exists | Use `distinctPropertyValuesInElementGroupByName` to verify |
| Confuse `Property` with `PropertyDefinition` | Property = value, PropertyDefinition = metadata |
| Use `properties` to get Level | Level is a reference, not a property |
| Ignore `displayValue` | Raw `value` may lack units; `displayValue` is human-readable |

---

## Units Type

Property definitions can have associated units:

```graphql
type Units {
  id: ID!      # Unit identifier
  name: String!  # e.g., "Square Feet", "Cubic Meters"
}
```

Access via:

```graphql
{
  propertyDefinitionsByElementGroup(elementGroupId: "{{elementGroupId}}") {
    results {
      name
      units {
        id
        name
      }
    }
  }
}
```
