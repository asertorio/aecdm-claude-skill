// AECDM Types

export interface Hub {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
}

export interface ElementGroup {
  id: string;
  name: string;
  fileVersionUrn: string;
}

export interface Property {
  name: string;
  value: string;
}

export interface Element {
  id: string;
  name: string;
  properties: Property[];
}

// GraphQL Response Types
export interface HubsResponse {
  hubs: {
    pagination: { cursor: string | null };
    results: Hub[];
  };
}

export interface ProjectsResponse {
  projects: {
    pagination: { cursor: string | null };
    results: Project[];
  };
}

export interface ElementGroupsResponse {
  elementGroupsByProject: {
    results: Array<{
      id: string;
      name: string;
      alternativeIdentifiers: {
        fileVersionUrn: string;
      };
    }>;
  };
}

export interface ElementsResponse {
  elementsByElementGroup: {
    results: Array<{
      id: string;
      name: string;
      properties: {
        results: Property[];
      };
    }>;
  };
}

// App State Types (no "viewer" -- viewer is external)
export type AppView = "auth" | "browser";
