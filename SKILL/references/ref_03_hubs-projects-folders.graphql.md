# Hubs, Projects, and Folders

## Overview

This file contains the organizational hierarchy types for Autodesk Construction Cloud (ACC). Hubs contain Projects, and Projects contain Folders. This represents the top-level navigation structure before reaching ElementGroups and Elements.

## Dependencies

- `ref_00_schema-core.graphql.md` - DateTime scalar
- `ref_02_pagination.graphql.md` - Pagination, PaginationInput
- `ref_04_element-groups-and-versions.graphql.md` - ElementGroup, ElementGroups, ElementGroupFilterInput
- `ref_10_users-and-units.graphql.md` - User

## Schema Content

```graphql
# ============================================================
# HUB TYPES
# ============================================================

"""
Represents a hub.

A hub is a container of projects, shared resources, and users with a common context.
"""
type Hub {
  "The ID that uniquely identifies the hub."
  id: ID!
  "A human-readable name to identify the hub."
  name: String
  """
  Contains a list of projects within the specified hub. Expand to see the inputs for this field.
  @param {ProjectFilterInput=} filter - Specifies how to filter a list of projects. You can filter by name.
  @param {PaginationInput=} pagination - Specifies how to split the response into multiple pages.
  """
  projects(filter: ProjectFilterInput, pagination: PaginationInput): Projects
  "Alternative identifiers for this hub."
  alternativeIdentifiers: HubAlternativeIdentifiers
}

"Alternative ways of referencing a hub."
type HubAlternativeIdentifiers {
  "The ID of this hub when accessing it through forgeDM."
  dataManagementAPIHubId: ID!
}

"""
Contains a list of hubs returned in response to a query.

A hub is a container of projects, shared resources, and users with a common context.
"""
type Hubs {
  "Contains information about the current page, when results are split into multiple pages."
  pagination: Pagination
  "An array that contains objects representing hubs."
  results: [Hub]!
}

"Specifies how to filter hubs."
input HubFilterInput {
  "The name of the hub you want to match. Currently, only exact matches are supported."
  name: String
}

# ============================================================
# PROJECT TYPES
# ============================================================

"""
Represents a project.

A project is a shared workspace for teams of people working together on a project, to store, organize, and manage all related entity data.
"""
type Project {
  "The ID that uniquely identifies the project."
  id: ID!
  "An object representing the hub that contains this project."
  hub: Hub
  """
  The ElementGroups within the project
  @param {ElementGroupFilterInput=} filter - Specifies how to filter
  @param {PaginationInput=} pagination - Specifies how to split the response into multiple pages.
  """
  elementGroups(filter: ElementGroupFilterInput, pagination: PaginationInput): ElementGroups!
  "The name of the project."
  name: String
  "Alternative identifiers for this project."
  alternativeIdentifiers: ProjectAlternativeIdentifiers
  """
  The top-level folders within the project.
  @param {PaginationInput=} pagination - Specifies how to split the response into multiple pages.
  @param {FolderFilterInput=} filter - Specifies how to filter on folders.
  """
  folders(pagination: PaginationInput, filter: FolderFilterInput): Folders
}

"Alternative ways of referencing a project."
type ProjectAlternativeIdentifiers {
  "The ID of this project when accessing it through forgeDM."
  dataManagementAPIProjectId: ID!
}

"Contains a list of projects returned in response to a query."
type Projects {
  "Contains information about the current page, when results are split into multiple pages."
  pagination: Pagination
  "An array that contains objects representing projects."
  results: [Project]!
}

"Specifies how to filter projects."
input ProjectFilterInput {
  "The name of the project you want to match. Currently, only exact matches are supported."
  name: String
}

# ============================================================
# FOLDER TYPES
# ============================================================

"""
Represents a folder.

A folder is a location for storing files, data, and other folders (sub-folders).
"""
type Folder {
  "The ID that uniquely identifies the folder."
  id: ID!
  "An object representing the project that contains this folder."
  project: Project
  """
  The ElementGroups within the folder
  @param {ElementGroupFilterInput=} filter - Specifies how to filter
  @param {PaginationInput=} pagination - Specifies how to split the response into multiple pages.
  """
  elementGroups(filter: ElementGroupFilterInput, pagination: PaginationInput): ElementGroups!
  """
  Retrieves elementGroups in the given folder and it's sub-folders recursively, using additional RSQL filters if provided.
  @param {ElementGroupFilterInput=} filter - RSQL filter to use for searching elementGroups.
  @param {PaginationInput=} pagination - Specifies how to split the response into multiple pages.
  """
  elementGroupsByFolderAndSubFolders(filter: ElementGroupFilterInput, pagination: PaginationInput): ElementGroups!
  "An object representing the hub that contains this folder."
  hub: Hub
  "The folder that contains this folder."
  parentFolder: Folder
  "A human-readable name to identify this folder."
  name: String
  "The folder path as a string from project root to this folder (e.g., '/Design/Seats/Seat Cover')."
  path: String
  "Indicates when this folder was created."
  createdOn: DateTime
  "An object representing the user who created this folder."
  createdBy: User
  "Indicates when this folder was most recently modified."
  lastModifiedOn: DateTime
  "An object representing the user who made the most recent modification."
  lastModifiedBy: User
  "Indicates the number items (folders and files) contained in this folder."
  objectCount: Int
  """
  Contains a list of folders that meet the specified filter criteria. You specify the filter criteria as an input to this field. Expand to see the inputs for this field.
  @param {FolderFilterInput=} filter - Specifies how to filter on folders.
  @param {PaginationInput=} pagination - Specifies how to split the response into multiple pages.
  """
  folders(filter: FolderFilterInput, pagination: PaginationInput): Folders
}

"""
A list of Folders returned in response to a query.

A folder contains items, such as designs and sub-folders.
"""
type Folders {
  "Contains information about the current page, when results are split into multiple pages."
  pagination: Pagination
  "An array that contains objects representing items."
  results: [Folder!]
}

"Specifies how to filter folders."
input FolderFilterInput {
  "The name of the item you want to match. Currently, only exact matches are supported."
  name: String
}
```
