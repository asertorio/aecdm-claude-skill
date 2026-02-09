# AECDM GraphQL — Core Object Model

This document explains the **shape of the building model** — the core types and how they connect.

---

## Object Hierarchy

```
Hub                              (Organization container)
 │
 └─ Project                      (Shared workspace)
     │
     ├─ Folder                   (File organization)
     │   └─ Folder               (Nested folders)
     │
     └─ ElementGroup             (Revit model / design file)
         │
         ├─ ElementGroupVersion  (Specific version snapshot)
         │
         └─ Element              (Building component)
             │
             ├─ properties       (Dynamic metadata: Area, Volume, custom params)
             ├─ references       (Relationships: Level, Space, Type)
             └─ referencedBy     (Reverse relationships)
```

---

## Core Types Explained

### Hub

**What it represents:** An organization or account container — the top level of the hierarchy.

**Key fields:**
- `id: ID!` — Unique identifier
- `name: String` — Human-readable name
- `projects` — List of projects in this hub
- `alternativeIdentifiers.dataManagementAPIHubId` — Legacy ID for Data Management API

**Traversal:**
```graphql
hub(hubId: "...") {
  projects {
    results { id name }
  }
}
```

---

### Project

**What it represents:** A shared workspace for teams to store and organize design data.

**Key fields:**
- `id: ID!` — Unique identifier
- `name: String` — Project name
- `hub` — Parent hub
- `folders` — Top-level folders
- `elementGroups` — All models in this project
- `alternativeIdentifiers.dataManagementAPIProjectId` — Legacy ID

**Traversal:**
```graphql
project(projectId: "...") {
  name
  folders { results { id name path } }
  elementGroups { results { id name } }
}
```

---

### Folder

**What it represents:** A location for organizing files and other folders within a project.

**Key fields:**
- `id: ID!` — Unique identifier
- `name: String` — Folder name
- `path: String` — Full path from project root (e.g., "/Design/Structural")
- `project` — Parent project
- `parentFolder` — Parent folder (null for top-level)
- `folders` — Subfolders
- `elementGroups` — Models directly in this folder
- `elementGroupsByFolderAndSubFolders` — Models in this folder and all descendants

**Traversal:**
```graphql
folder(projectId: "...", folderId: "...") {
  name
  path
  folders { results { id name } }
  elementGroups { results { id name } }
}
```

---

### ElementGroup

**What it represents:** A Revit model (or other design file). This is the container for building elements.

**Key fields:**
- `id: ID!` — Unique identifier
- `name: String` — Model name
- `elements` — Building components in this model
- `propertyDefinitions` — Property metadata available in this model
- `version` — Current version info
- `versionHistory` — Access to all versions and `tipVersion`
- `parentFolder` — Folder containing this model
- `alternativeIdentifiers.fileUrn` — File URN for this model
- `createdBy`, `createdOn`, `lastModifiedBy`, `lastModifiedOn` — Audit info

**Traversal:**
```graphql
elementGroupAtTip(elementGroupId: "...") {
  name
  elements(filter: { name: ["Wall"] }) {
    results { id name }
  }
  versionHistory {
    tipVersion { versionNumber }
  }
}
```

---

### ElementGroupVersion

**What it represents:** A specific version/snapshot of an ElementGroup.

**Key fields:**
- `versionNumber: Int!` — Version number (1, 2, 3, ...)
- `createdOn: DateTime` — When this version was created
- `createdBy: User` — Who created this version
- `elementGroup` — The ElementGroup at this version

**Access patterns:**
```graphql
# Via version history
elementGroupAtTip(elementGroupId: "...") {
  versionHistory {
    tipVersion {           # Latest version
      versionNumber
      createdOn
    }
    versions {             # All versions
      results {
        versionNumber
        createdOn
      }
    }
    versionByNumber(versionNumber: 5) {  # Specific version
      versionNumber
    }
  }
}

# Direct access to specific version
elementGroupByVersionNumber(elementGroupId: "...", versionNumber: 5) {
  name
  elements { results { id } }
}
```

---

### ElementGroupVersionHistory

**What it represents:** Container for version-related queries on an ElementGroup.

**Key fields:**
- `id: ID!` — Identifier
- `tipVersion` — The latest version (most commonly used)
- `versions` — Paginated list of all versions
- `versionByNumber(versionNumber: Int)` — Get a specific version

---

### Element

**What it represents:** A building component — walls, doors, windows, levels, spaces, rooms, equipment, etc.

**Key fields:**
- `id: ID!` — Unique identifier
- `name: String!` — Element name (e.g., "Basic Wall", "Level 1", "Room 101")
- `properties` — Dynamic properties (Area, Volume, custom parameters)
- `references` — Relationships to other elements (Level, Space, Type)
- `referencedBy` — Reverse lookup — elements that reference this one
- `elementGroup` — Parent model
- `alternativeIdentifiers.externalElementId` — ID in AEC Docs
- `alternativeIdentifiers.revitElementId` — Original Revit element ID
- `createdBy`, `createdOn`, `lastModifiedBy`, `lastModifiedOn` — Audit info

**Important:** Elements include not just physical objects (walls, doors) but also spatial/organizational objects (Levels, Spaces, Rooms, Grids).

**Traversal:**
```graphql
elementAtTip(elementId: "...") {
  id
  name
  properties(filter: { names: ["Area", "Volume"] }) {
    results {
      name
      value
      displayValue
    }
  }
  references(filter: { names: ["Level"] }) {
    results {
      name
      value { id name }  # The referenced Level element
    }
  }
  elementGroup { id name }
}
```

---

## Connection Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                            Hub                                   │
│  id, name, projects, alternativeIdentifiers                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │ hub.projects
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Project                                 │
│  id, name, hub, folders, elementGroups, alternativeIdentifiers  │
└──────────────┬─────────────────────────────┬────────────────────┘
               │ project.folders              │ project.elementGroups
               ▼                              │
┌──────────────────────────────┐              │
│           Folder             │              │
│  id, name, path, folders,    │              │
│  elementGroups, parentFolder │              │
└──────────────┬───────────────┘              │
               │ folder.elementGroups         │
               ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       ElementGroup                               │
│  id, name, elements, propertyDefinitions, versionHistory        │
│  version, parentFolder, alternativeIdentifiers                  │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
               │ elementGroup.elements        │ elementGroup.versionHistory
               ▼                              ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│          Element             │   │   ElementGroupVersionHistory │
│  id, name, properties,       │   │   tipVersion, versions,      │
│  references, referencedBy,   │   │   versionByNumber            │
│  elementGroup, altIds        │   └──────────────┬───────────────┘
└──────────────────────────────┘                  │
                                                  ▼
                                   ┌──────────────────────────────┐
                                   │    ElementGroupVersion       │
                                   │    versionNumber, createdOn, │
                                   │    createdBy, elementGroup   │
                                   └──────────────────────────────┘
```

---

## Common Traversal Patterns

### Hub → Elements (full navigation)
```graphql
{
  hub(hubId: "{{hubId}}") {
    projects {
      results {
        elementGroups {
          results {
            elements {
              results { id name }
            }
          }
        }
      }
    }
  }
}
```

### Direct to Elements (when you have IDs)
```graphql
{
  elementsByElementGroup(elementGroupId: "{{elementGroupId}}") {
    results { id name }
  }
}
```

### Element → Its Model
```graphql
{
  elementAtTip(elementId: "{{elementId}}") {
    name
    elementGroup {
      id
      name
      parentFolder { path }
    }
  }
}
```

---

## Key Takeaways

1. **Hierarchy matters:** Hub → Project → Folder → ElementGroup → Element
2. **ElementGroup = Revit model:** This is where building data lives
3. **Elements include everything:** Physical objects AND spatial/organizational objects (Levels, Spaces)
4. **Versions are on ElementGroup:** Not on individual elements
5. **Properties and References are on Element:** Access via `element.properties` and `element.references`
