# Element Groups and Versions

## Overview

This file contains types for ElementGroups (representing Revit models and other design files) and their version history. ElementGroups are the containers for Elements and manage versioning of design data. This also includes extraction status types for monitoring data processing.

## Dependencies

- `ref_00_schema-core.graphql.md` - DateTime scalar
- `ref_02_pagination.graphql.md` - Pagination, PaginationInput
- `ref_03_hubs-projects-folders.graphql.md` - Folder
- `ref_05_elements.graphql.md` - Elements, ElementFilterInput
- `ref_07_property-definitions.graphql.md` - PropertyDefinitions, PropertyDefinitionFilterInput
- `ref_10_users-and-units.graphql.md` - User

## Tightly-Coupled Types Included

The `ExtractionStatus` enum is included here for self-consistency since it is used exclusively by extraction-related types.

## Schema Content

```graphql
# ============================================================
# TIGHTLY-COUPLED ENUM (also in ref_00)
# ============================================================

"Extraction status."
enum ExtractionStatus {
  "Extraction in progress."
  IN_PROGRESS
  "Extraction failed."
  FAILED
  "Extraction is successful."
  SUCCESS
}

# ============================================================
# ELEMENT GROUP TYPES
# ============================================================

"Represents a Revit model."
type ElementGroup {
  "Globally unique identifier."
  id: ID!
  "Name of the ElementGroup Container."
  name: String
  """
  Get Elements
  @param {ElementFilterInput=} filter - RSQL filter to use for searching elements.
  @param {PaginationInput=} pagination - Specifies how to split the response into multiple pages.
  """
  elements(filter: ElementFilterInput, pagination: PaginationInput): Elements!
  """
  Get all Property Definitions used in this elementGroup
  @param {PropertyDefinitionFilterInput=} filter - Specifies how to filter on property definitions.
  @param {PaginationInput=} pagination - Specifies how to split the response into multiple pages.
  """
  propertyDefinitions(filter: PropertyDefinitionFilterInput, pagination: PaginationInput): PropertyDefinitions!
  "Specific version of this ElementGroup."
  version: ElementGroupVersion
  "Version history for this elementGroup"
  versionHistory: ElementGroupVersionHistory!
  "User responsible for creating this elementGroup"
  createdBy: User
  "Timestamp of elementGroup creation"
  createdOn: DateTime
  "Latest user who modified this elementGroup "
  lastModifiedBy: User
  "Latest timestamp when this elementGroup was modified"
  lastModifiedOn: DateTime
  "Alternative identifiers for this elementGroup"
  alternativeIdentifiers: ElementGroupAlternativeIdentifiers
  "Parent folder containing this elementGroup"
  parentFolder: Folder
}

"Contains alternative identifiers for an AEC elementGroup"
type ElementGroupAlternativeIdentifiers {
  "File uniform resource name for the elementGroup"
  fileUrn: ID
  "File version uniform resource name for the elementGroup"
  fileVersionUrn: ID
}

"Contains a list of ElementGroups returned in response to a query."
type ElementGroups {
  "Contains information about the current page when results are split into multiple pages."
  pagination: Pagination
  "An array containing ElementGroups"
  results: [ElementGroup]!
}

"Query input for filtering ElementGroups."
input ElementGroupFilterInput {
  "Query filter in RSQL format to search for elementGroups"
  query: String
  "Filter for elementGroups with a specified name"
  name: [String!]
  "Filter for elementGroups created by a specified user (email)"
  createdBy: [String!]
  "Filter for elementGroups last modified by a specified user (email)"
  lastModifiedBy: [String!]
  "Filter for elementGroups with a specified file URN"
  fileUrn: [String!]
}

# ============================================================
# VERSION TYPES
# ============================================================

"Represents a single version of an ElementGroup."
type ElementGroupVersion {
  "version number"
  versionNumber: Int!
  "Date and time of version creation."
  createdOn: DateTime
  "User that created this specific version."
  createdBy: User
  "The ElementGroup at this version."
  elementGroup: ElementGroup
}

"Information related to versions of an elementGroup."
type ElementGroupVersionHistory {
  "Globally unique identifier."
  id: ID!
  "Latest version."
  tipVersion: ElementGroupVersion
  """
  Query for a specific set of versions.
  @param {VersionFilterInput=} filter - Specifies how to filter using version specific criteria.
  @param {PaginationInput=} pagination - Specifies how to split the response into multiple pages.
  """
  versions(filter: ElementGroupVersionFilterInput, pagination: PaginationInput): ElementGroupVersions!
  """
  Query for a specific version by its version number.
  @param {Int=} versionNumber - Version number to use for fetching version.
  """
  versionByNumber(versionNumber: Int): ElementGroupVersion
}

"An array of versions."
type ElementGroupVersions {
  "Contains information about the current page, when results are split into multiple pages."
  pagination: Pagination
  "An array of versions"
  results: [ElementGroupVersion]!
}

"Input to filter using version criteria."
input ElementGroupVersionFilterInput {
  "version number to use for filtering"
  number: Int
  "createdAfter datetime filter"
  createdAfter: DateTime
  "createdBefore datetime filter"
  createdBefore: DateTime
  "createdOn datetime filter"
  createdOn: DateTime
  "filter based on user who created the version"
  createdBy: ID
}

# ============================================================
# EXTRACTION STATUS TYPES
# ============================================================

"Information about elementGroup extraction status."
type ElementGroupExtractionStatus {
  "Extraction status."
  status: ExtractionStatus!
  "Additional information about extraction status."
  details: String
  "If available, the ElementGroup which corresponds to the extraction."
  elementGroup: ElementGroup
}

"Input to subscribe to element group extraction events by URN."
input ElementGroupExtractionByFileUrnInput {
  "File to retrieve elementGroup extraction status from"
  fileUrn: String!
  "Project to retrieve elementGroups from"
  accProjectId: ID!
}

"Input to subscribe to element group extraction events by project."
input ElementGroupExtractionByProjectInput {
  "Project to retrieve elementGroups from"
  accProjectId: ID!
}
```
