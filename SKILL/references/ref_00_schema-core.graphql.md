# Schema Core - Scalars, Enums, and Directives

## Overview

This file contains the foundational GraphQL schema elements: the schema definition block, custom scalars, enums used across the API, and directives. These are the building blocks referenced by all other schema files.

## Dependencies

None - this is the foundation file.

## Schema Content

```graphql
schema {
  query: Query
  subscription: Subscription
}

# ============================================================
# CUSTOM SCALARS
# ============================================================

"An ISO-8601 encoded UTC date string."
scalar DateTime

"Custom scalar which represents the list of user's email address."
scalar EmailAddress

"Custom scalar which represents custom property values."
scalar PropertyValue

"Scalar which represents URL."
scalar Url

# ============================================================
# ENUMS
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

"Extraction status."
enum ExtractionStatus {
  "Extraction in progress."
  IN_PROGRESS
  "Extraction failed."
  FAILED
  "Extraction is successful."
  SUCCESS
}

"Folder member status. Only applicable for folder level projects."
enum FolderMemberStatus {
  "Currently an active member."
  ACTIVE
  "Member is currently inactive."
  INACTIVE
  "Invitation sent, awaiting acceptance."
  PENDING
}

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

"Represents the different regions where Autodesk data can be stored."
enum Region {
  "Europe, Middle East, and Africa"
  EMEA
  "Australia"
  AUS
  "United States"
  US
  "India"
  IND
  "Canada"
  CAN
  "Germany"
  DEU
  "Great Britain"
  GBR
  "Japan"
  JPN
}

# ============================================================
# DIRECTIVES
# ============================================================

"Exposes a URL that specifies the behavior of this scalar."
directive @specifiedBy(
    "The URL that specifies the behavior of this scalar."
    url: String!
  ) on SCALAR

directive @defer(label: String, if: Boolean! = true) on FRAGMENT_SPREAD | INLINE_FRAGMENT
```
