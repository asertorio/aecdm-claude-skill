# Users and Units

## Overview

This file contains types for Users (representing Autodesk account users) and Units (measurement units for property values). These are referenced throughout the API for tracking who created/modified entities and what units properties use.

## Dependencies

- `ref_00_schema-core.graphql.md` - DateTime, EmailAddress scalars

## Schema Content

```graphql
# ============================================================
# USER TYPES
# ============================================================

"An object representing a User."
type User {
  "The ID that uniquely identifies the User."
  id: ID!
  "The display name of the user."
  userName: String
  "The user's first name."
  firstName: String
  "The user's last name."
  lastName: String
  "The user's email address."
  email: String
  "The date and time the user's information was last modified."
  lastModifiedOn: DateTime
  "The date and time the user's information was created."
  createdOn: DateTime
}

"Input object to filter tip component and tip component versions by user details."
input UserSearchInput {
  "IDs of users"
  ids: [ID!]!
}

# ============================================================
# UNITS TYPE
# ============================================================

"Represents the unit of measurement for a property."
type Units {
  "Id of the corresponding unit."
  id: ID!
  "Name of the corresponding unit."
  name: String!
}
```

## Usage Notes

- `User` appears in `createdBy` and `lastModifiedBy` fields throughout the API
- `Units` is used by `PropertyDefinition` to specify measurement units
- Filter by user email using string fields in filter inputs (e.g., `createdBy: ["user@example.com"]`)
