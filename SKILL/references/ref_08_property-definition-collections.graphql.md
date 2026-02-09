# Property Definition Collections

## Overview

This file contains types for property definition collections - logical groupings of property definitions. Collections help organize related property definitions and can be used to manage sets of custom properties.

## Dependencies

- `ref_02_pagination.graphql.md` - Pagination, PaginationInput
- `ref_07_property-definitions.graphql.md` - PropertyDefinition, PropertyDefinitions, PropertyDefinitionFilterInput

## Schema Content

```graphql
# ============================================================
# PROPERTY DEFINITION COLLECTION TYPES
# ============================================================

"Data object that represents property definition collection."
type PropertyDefinitionCollection {
  "The ID of this property definition collection."
  id: ID!
  "Name for this property definition collection."
  name: String
  "Description for this property definition collection."
  description: String
  """
  Get all Property Definitions of this Collection.
  @param {PropertyDefinitionFilterInput=} filter - Specifies how to filter on property definitions.
  @param {PaginationInput=} pagination - Specifies how to split the response into multiple pages.
  """
  definitions(filter: PropertyDefinitionFilterInput, pagination: PaginationInput): PropertyDefinitions
}

"Contains a list of Property Definition Collections returned in response to a query."
type PropertyDefinitionCollections {
  "An array of Property Definition Collections."
  results: [PropertyDefinitionCollection]!
  "Contains information about the current page, when results are split into multiple pages."
  pagination: Pagination
}

# ============================================================
# INPUTS
# ============================================================

"Specifies how to filter property definition collections."
input PropertyDefinitionCollectionFilterInput {
  "The ID of the property definition collection that needs to be filtered."
  id: [ID!]!
}

# ============================================================
# MUTATION PAYLOADS
# ============================================================

"Return payload on property definition collection creation."
type CreatePropertyDefinitionCollectionPayload {
  "Object representing the property definition collection."
  propertyDefinitionCollection: PropertyDefinitionCollection!
}
```
