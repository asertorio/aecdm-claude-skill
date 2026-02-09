# Pagination

## Overview

This file contains the pagination types used throughout the AECDM GraphQL API. The `Pagination` type appears in query results to indicate page boundaries, while `PaginationInput` is used to request specific pages of data.

## Dependencies

None - this is a shared utility used by all collection types.

## Schema Content

```graphql
"Contains information about the current page, when results are split into multiple pages."
type Pagination {
  "The address of the next page, if one exists. If the current page is the last page, ``cursor`` is ``null``."
  cursor: String
  "The number of items in the response page."
  pageSize: Int
}

"Specifies how to split the response into multiple pages."
input PaginationInput {
  "Specifies what page to fetch. If you don't specify ``cursor``, fetches the first page."
  cursor: String
  "The maximum number of items to return in a page. The default value for ``limit`` varies from query to query."
  limit: Int
}
```

## Usage Notes

- When paginating, check if `pagination.cursor` is `null` to determine if you've reached the last page
- Pass the cursor value from the response to fetch the next page
- The `limit` parameter controls page size; default values vary by query
