# Reference Properties

## Overview

This file contains types for reference properties - relationships between Elements. Reference properties represent how elements relate to each other (e.g., a wall referencing its level, a door referencing its host wall). These are NOT scalar properties but object references.

## Dependencies

- `ref_02_pagination.graphql.md` - Pagination, PaginationInput
- `ref_05_elements.graphql.md` - Element
- `ref_07_property-definitions.graphql.md` - PropertyDefinition

## Important Distinction

Reference properties are **object relationships**, not scalar values:
- A `level` reference points to a Level Element object
- A `host` reference points to another Element
- These are NOT the same as string/number properties

## Schema Content

```graphql
# ============================================================
# REFERENCE PROPERTY TYPES
# ============================================================

"Reference properties."
type ReferenceProperties {
  "An array representing reference properties"
  results: [ReferenceProperty]!
  "Contains information about the current page, when results are split into multiple pages."
  pagination: Pagination
}

"A reference property which describes relationship between elements."
type ReferenceProperty {
  "The human-readable Length value of the property."
  displayValue: String
  "Human readable name for a Property."
  name: String!
  "Information about the Property."
  definition: PropertyDefinition
  "Data value for the Property"
  value: Element
}

# ============================================================
# FILTER INPUTS
# ============================================================

"Filter using references."
input ReferencePropertyFilterInput {
  names: [String!]
}
```

## Usage Notes

- The `value` field on `ReferenceProperty` returns an `Element`, not a scalar
- Use `ReferencePropertyFilterInput` to filter which reference properties to include
- Common reference property names include: `level`, `host`, `type`
- To filter elements BY their references, use `ElementReferenceFilterInput` in `ElementFilterInput` (see ref_05)
