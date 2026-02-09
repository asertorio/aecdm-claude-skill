# Properties, Values, and Distinct Values

## Overview

This file contains types for querying element properties and retrieving distinct property values. Properties are key-value pairs attached to Elements, distinct from scalar fields and references. Use these types to access metadata and filter by property values.

## Dependencies

- `ref_00_schema-core.graphql.md` - PropertyValue scalar
- `ref_02_pagination.graphql.md` - Pagination, PaginationInput
- `ref_07_property-definitions.graphql.md` - PropertyDefinition

## Tightly-Coupled Types Included

The `Comparators` enum and `ValueComparatorInput` are included here because they are essential for property value filtering.

## Schema Content

```graphql
# ============================================================
# TIGHTLY-COUPLED TYPES FOR FILTERING (also in ref_05)
# ============================================================

"Valid comparators when filtering by a value"
enum Comparators {
  "Case sensitive"
  CASE_SENSITIVE
  "Contains"
  CONTAINS
  "Starts with"
  STARTS_WITH
  "Ends with"
  ENDS_WITH
  "Greater than"
  GREATER_THAN
  "Less than"
  LESS_THAN
  "Greater than or equal to"
  GREATER_THAN_EQUAL_TO
  "Less than or equal to"
  LESS_THAN_EQUAL_TO
  "Not equal to"
  NOT_EQUAL
}

"Query input for filtering by a value with a specific comparator"
input ValueComparatorInput {
  "Desired value"
  value: String!
  "Comparator to apply"
  comparator: Comparators
}

# ============================================================
# PROPERTY TYPES
# ============================================================

"Object representing list of Properties."
type Properties {
  "An array of Properties."
  results: [Property]!
  "Contains information about the current page, when results are split into multiple pages."
  pagination: Pagination
}

"Data object that represents property."
type Property {
  "Human readable name for a Property."
  name: String!
  "Display value of the property."
  displayValue: String
  "Value of the property."
  value: PropertyValue
  "Data object that represents property definition."
  definition: PropertyDefinition!
}

"Specifies how to filter property."
input PropertyFilterInput {
  "The names of the property that needs to be to filtered."
  names: [String!]!
}

# ============================================================
# DISTINCT PROPERTY VALUE TYPES
# ============================================================

"A PropertyValue and its count"
type DistinctPropertyValue {
  "A distinct property value."
  value: PropertyValue!
  "The number of times the distinct property value is found."
  count: Int!
}

"Contains a list of DistinctPropertyValue returned in response to a query."
type DistinctPropertyValues {
  "Information about the Property of the distinct values returned."
  definition: PropertyDefinition
  """
  An array of distinct property values.
  @param {Int=} limit - Limit the number of distinct values returned. Does not support pagination. Default = 200, maximum = 2000.
  """
  values(limit: Int = 200): [DistinctPropertyValue!]
}

"A collection of distinct properties matching the name given."
type DistinctPropertyValuesCollection {
  "Contains information about the current page when results are split into multiple pages."
  pagination: Pagination
  "An array of distinct property values matching the name given."
  results: [DistinctPropertyValues]!
}
```

## Usage Notes

- Properties are dynamic metadata attached to Elements, not scalar fields
- Use `PropertyFilterInput` to request specific properties by name
- `DistinctPropertyValues` is useful for getting unique values for filtering UIs
- The `definition` field links a property value back to its `PropertyDefinition`
