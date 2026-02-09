# Property Definitions

## Overview

This file contains types for property definitions - the templates that define what properties can exist on elements. Property definitions specify the name, data type (specification), units, and behavior of properties. They can be organized into collections.

## Dependencies

- `ref_02_pagination.graphql.md` - Pagination, PaginationInput
- `ref_08_property-definition-collections.graphql.md` - PropertyDefinitionCollection
- `ref_10_users-and-units.graphql.md` - Units

## Tightly-Coupled Types Included

The `PropertyBehaviorEnum` is included here because it is exclusively used by property definition types.

## Schema Content

```graphql
# ============================================================
# TIGHTLY-COUPLED ENUM (also in ref_00)
# ============================================================

"Supported property behaviors"
enum PropertyBehaviorEnum {
  "Properties that affect the form, fit, or function of an entity. If values are changed, a \"new version\" of the entity is created."
  STANDARD
  "Properties that are only applicable at a specific, historical version of an entity. Typically used for \"computed\" values."
  DYNAMIC_AT_VERSION
  "Properties that are only applicable at a specific, historical version of an entity. When an entity is changed, current value is copied over to the next entity version."
  DYNAMIC
  "Properties that are applied at the 'lineage' of an entity. Only one value of property exists at any given time for all versions/revisions of an entity and changes to value does not require a revision."
  TIMELESS
}

# ============================================================
# PROPERTY DEFINITION TYPES
# ============================================================

"""
Data object that represents property definition.

Property definition is an object that acts as a template to create properties on an entity.
"""
type PropertyDefinition {
  "Name for this property definition."
  name: String!
  "Specification of the property definition. It represents the data type of a property definition."
  specification: String
  "Unit of a property definition."
  units: Units
  "The ID of property definition."
  id: ID!
  "A short description of the property definition."
  description: String
  "Indicates if the parameter is hidden or not in the application."
  isHidden: Boolean
  """
  ``true`` : The property definition is archived.
  
  ``false`` : The property definition is active.
  """
  isArchived: Boolean
  "Indicates if the parameter is read-only or not in the application."
  isReadOnly: Boolean
  "Specifies expected behavior for the property on document data management operation like 'copy' in Autodesk authoring apps. A value of 'true' means the property will be copied along to the new document on such operations."
  shouldCopy: Boolean
  "Property definition collection in which this property definition is present."
  collection: PropertyDefinitionCollection
}

"List of property definitions."
type PropertyDefinitions {
  "An array of property definition."
  results: [PropertyDefinition]!
  "Contains information about the current page, when results are split into multiple pages."
  pagination: Pagination
}

"AEC Mutation Errors"
type PropertyDefinitionChangeError {
  id: ID
  code: String
  title: String
  detail: String
}

# ============================================================
# PROPERTY DEFINITION INPUTS
# ============================================================

"Specifies how to filter property definitions."
input PropertyDefinitionFilterInput {
  names: [String!]
}

"Input required for creating property definition."
input PropertyDefinitionInput {
  "Name for uniquely identifying a property definition."
  name: String!
  "Behavior of a property."
  propertyBehavior: PropertyBehaviorEnum!
  """
  Specification of property definition.
  
  It represents the data type of a property definition.
  """
  specification: String!
  "Indicates if the parameter is read-only or not in the application."
  isReadOnly: Boolean
  "Indicates if the parameter is hidden or not in the application."
  isHidden: Boolean
  "A short description of the property definition."
  description: String
  "Indicates if the parameter is archived or not in the application."
  isArchived: Boolean
}

"Input required for creating property definitions."
input CreatePropertyDefinitionsInput {
  "The ID of property definition collection."
  propertyDefinitionCollectionId: ID!
  "List of property definitions to be created."
  propertyDefinitionsInput: [PropertyDefinitionInput!]!
}

# ============================================================
# MUTATION PAYLOADS
# ============================================================

"Response of ``create`` property definitions operation."
type CreatePropertyDefinitionsPayload {
  "An array of created property definition objects."
  propertyDefinitions: [PropertyDefinition!]!
}
```
