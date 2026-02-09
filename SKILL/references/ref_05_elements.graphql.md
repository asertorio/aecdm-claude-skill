# Elements

## Overview

This file contains the Element type - the core building block of AEC data representing individual design elements (walls, doors, windows, etc.) within a Revit model. Elements belong to ElementGroups and can have properties, references to other elements, and metadata.

## Dependencies

- `ref_00_schema-core.graphql.md` - DateTime scalar
- `ref_02_pagination.graphql.md` - Pagination, PaginationInput
- `ref_04_element-groups-and-versions.graphql.md` - ElementGroup
- `ref_06_properties-values-and-distinct.graphql.md` - Properties, PropertyFilterInput
- `ref_09_reference-properties.graphql.md` - ReferenceProperties, ReferencePropertyFilterInput
- `ref_10_users-and-units.graphql.md` - User

## Tightly-Coupled Types Included

The `Comparators` enum and `ValueComparatorInput` are included here because they are essential for understanding how to filter elements.

## Schema Content

```graphql
# ============================================================
# TIGHTLY-COUPLED TYPES FOR FILTERING (also in ref_06)
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
# ELEMENT TYPES
# ============================================================

"Represents an element type."
type Element {
  "Globally unique identifier for an Element."
  id: ID!
  "The human-readable name of the Element"
  name: String!
  """
  Query for specific Properties
  @param {PropertyFilterInput=} filter - Specifies which properties to return.
  @param {PaginationInput=} pagination - Specifies how to split the response into multiple pages.
  @param {String=} includeReferencesProperties - Must be set to the reference name.
  """
  properties(filter: PropertyFilterInput, pagination: PaginationInput, includeReferencesProperties: String): Properties!
  """
  Represents information that further defines the Element (e.g. Type data)
  @param {ReferencePropertyFilterInput=} filter - Specifies which reference properties to return.
  @param {PaginationInput=} pagination - Specifies how to split the response into multiple pages.
  """
  references(filter: ReferencePropertyFilterInput, pagination: PaginationInput): ReferenceProperties
  "User responsible for creating this element"
  createdBy: User
  "Timestamp of element creation"
  createdOn: DateTime
  "Latest user who modified the data "
  lastModifiedBy: User
  "Latest timestamp when the element was modified"
  lastModifiedOn: DateTime
  """
  Elements which have references to the current element
  @param {String} name - The name of relationship to find references for.
  @param {ElementFilterInput=} filter - Specifies how to filter elements with references to current element.
  @param {PaginationInput=} pagination - Specifies how to split the response into multiple pages.
  """
  referencedBy(name: String!, filter: ElementFilterInput, pagination: PaginationInput): Elements
  "Alternative identifiers for this element"
  alternativeIdentifiers: ElementAlternativeIdentifiers
  "The elementGroup which this element belongs to."
  elementGroup: ElementGroup
}

"Contains alternative identifiers for an element"
type ElementAlternativeIdentifiers {
  "The elements id when accessing it in AEC docs"
  externalElementId: ID!
  "The elements id in Revit"
  revitElementId: ID
}

"Contains a list of Cusors returned in response to a query."
type ElementCursors {
  "An array containing Cursors"
  results: [String!]!
}

"Contains a list of Elements returned in response to a query."
type Elements {
  """
  Total count of elements found for a given query.
  Will only be populated for the following fields:
  - 'Query.elements'
  - 'Query.elementsByElementGroup'
  - 'ElementGroup.elements'
  - 'Element.referencedBy'
  """
  totalCount: Int
  "Contains information about the current page, when results are split into multiple pages."
  pagination: Pagination
  "An array representing elements"
  results: [Element]!
}

# ============================================================
# ELEMENT FILTER INPUT
# ============================================================

"Query input for filtering Elements."
input ElementFilterInput {
  "Filter query in RSQL format for searching elements"
  query: String
  "Filter for elements with a specified name"
  name: [String!]
  "Filter for elements with a specified name and comparator to apply"
  nameWithComparator: [ValueComparatorInput!]
  "Filter for elements with specified property values"
  properties: [ElementPropertyFilterInput!]
  "Filter for elements with specified reference properties"
  references: [ElementReferenceFilterInput!]
  "Filter for elements created by a specified user (email)"
  createdBy: [String!]
  "Filter for elements last modified by a specified user (email)"
  lastModifiedBy: [String!]
  "Filter for elements by their ids"
  elementId: [String!]
  "Filter for elements by their revit element ids"
  revitElementId: [String!]
}

# ============================================================
# ELEMENT PROPERTY AND REFERENCE FILTER INPUTS
# ============================================================

"Query input for filtering Elements by their properties"
input ElementPropertyFilterInput {
  "Name of the property"
  name: String
  "ID of the property"
  id: String
  "Value that the property should have"
  value: [String!]
  "Value that the property should have and comparator to apply"
  valueWithComparator: [ValueComparatorInput!]
}

"Query input for filtering Elements by their references"
input ElementReferenceFilterInput {
  "Name of the reference property"
  name: String!
  "ID of the element that should be referenced by this property"
  referenceId: [String!]!
}
```
