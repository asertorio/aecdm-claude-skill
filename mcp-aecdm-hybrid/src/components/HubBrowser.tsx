import React, { useState, useEffect, useCallback } from "react";
import type { App } from "@modelcontextprotocol/ext-apps";
import type { Hub, Project, ElementGroup } from "../types";
import { getHubs, getProjects, getElementGroups } from "../api/aecdm";

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    height: "100%",
    overflow: "hidden",
  },
  header: {
    padding: "16px",
    borderBottom: "1px solid var(--color-border-primary, #e5e5e5)",
    background: "var(--color-background-secondary, #f5f5f5)",
  },
  title: {
    margin: 0,
    fontSize: "var(--font-heading-md-size, 18px)",
    fontWeight: "var(--font-weight-semibold, 600)" as const,
    color: "var(--color-text-primary, #1a1a1a)",
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: "var(--font-text-sm-size, 14px)",
    color: "var(--color-text-secondary, #666)",
  },
  treeContainer: {
    flex: 1,
    overflow: "auto",
    padding: "8px",
  },
  treeNode: {
    marginLeft: "0px",
  },
  treeNodeChild: {
    marginLeft: "20px",
  },
  nodeHeader: {
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    cursor: "pointer",
    borderRadius: "var(--border-radius-md, 6px)",
    transition: "background 0.15s",
    userSelect: "none" as const,
  },
  nodeHeaderHover: {
    background: "var(--color-background-tertiary, #eee)",
  },
  nodeIcon: {
    width: "20px",
    height: "20px",
    marginRight: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    color: "var(--color-text-secondary, #666)",
  },
  nodeName: {
    flex: 1,
    fontSize: "var(--font-text-md-size, 14px)",
    color: "var(--color-text-primary, #1a1a1a)",
  },
  nodeAction: {
    padding: "4px 8px",
    fontSize: "12px",
    background: "var(--color-accent-primary, #2563eb)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--border-radius-sm, 4px)",
    cursor: "pointer",
  },
  loading: {
    padding: "8px 12px 8px 40px",
    fontSize: "var(--font-text-sm-size, 13px)",
    color: "var(--color-text-secondary, #666)",
    fontStyle: "italic" as const,
  },
  error: {
    padding: "8px 12px 8px 40px",
    fontSize: "var(--font-text-sm-size, 13px)",
    color: "var(--color-error, #dc2626)",
  },
  empty: {
    padding: "8px 12px 8px 40px",
    fontSize: "var(--font-text-sm-size, 13px)",
    color: "var(--color-text-tertiary, #999)",
  },
};

// ============================================================================
// Tree Node Components
// ============================================================================

interface TreeNodeProps {
  label: string;
  icon: string;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
  action?: React.ReactNode;
  level?: number;
}

function TreeNode({ label, icon, expanded, onToggle, children, action, level = 0 }: TreeNodeProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div style={level > 0 ? styles.treeNodeChild : styles.treeNode}>
      <div
        style={{
          ...styles.nodeHeader,
          ...(isHovered ? styles.nodeHeaderHover : {}),
        }}
        onClick={onToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span style={styles.nodeIcon}>{expanded ? "▼" : "▶"}</span>
        <span style={styles.nodeIcon}>{icon}</span>
        <span style={styles.nodeName}>{label}</span>
        {action && <span onClick={(e) => e.stopPropagation()}>{action}</span>}
      </div>
      {expanded && children}
    </div>
  );
}

// ============================================================================
// Element Group Node (Leaf with View Button)
// ============================================================================

interface ElementGroupNodeProps {
  elementGroup: ElementGroup;
  onView: (eg: ElementGroup) => void;
}

function ElementGroupNode({ elementGroup, onView }: ElementGroupNodeProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        ...styles.nodeHeader,
        ...styles.treeNodeChild,
        ...(isHovered ? styles.nodeHeaderHover : {}),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span style={styles.nodeIcon}>📄</span>
      <span style={styles.nodeName}>{elementGroup.name}</span>
      <button
        style={styles.nodeAction}
        onClick={() => onView(elementGroup)}
      >
        View
      </button>
    </div>
  );
}

// ============================================================================
// Project Node
// ============================================================================

interface ProjectNodeProps {
  app: App;
  project: Project;
  onViewElementGroup: (eg: ElementGroup) => void;
}

function ProjectNode({ app, project, onViewElementGroup }: ProjectNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [elementGroups, setElementGroups] = useState<ElementGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadElementGroups = useCallback(async () => {
    if (loaded) return;
    
    setLoading(true);
    setError(null);
    try {
      const groups = await getElementGroups(app, project.id);
      setElementGroups(groups);
      setLoaded(true);
    } catch (err) {
      let errorMsg = err instanceof Error ? err.message : "Failed to load element groups";
      // Make internal server errors more user-friendly
      if (errorMsg.includes("Internal Server Error")) {
        errorMsg = "No models available. This project may not have any indexed models, or the models haven't finished processing yet.";
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [app, project.id, loaded]);

  const handleToggle = () => {
    if (!expanded && !loaded) {
      loadElementGroups();
    }
    setExpanded(!expanded);
  };

  return (
    <TreeNode
      label={project.name}
      icon="📁"
      expanded={expanded}
      onToggle={handleToggle}
      level={1}
    >
      {loading && <div style={styles.loading}>Loading models...</div>}
      {error && <div style={styles.error}>{error}</div>}
      {!loading && !error && loaded && elementGroups.length === 0 && (
        <div style={styles.empty}>No models found</div>
      )}
      {elementGroups.map((eg) => (
        <ElementGroupNode
          key={eg.id}
          elementGroup={eg}
          onView={onViewElementGroup}
        />
      ))}
    </TreeNode>
  );
}

// ============================================================================
// Hub Node
// ============================================================================

interface HubNodeProps {
  app: App;
  hub: Hub;
  onViewElementGroup: (eg: ElementGroup) => void;
}

function HubNode({ app, hub, onViewElementGroup }: HubNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadProjects = useCallback(async () => {
    if (loaded) return;
    
    setLoading(true);
    setError(null);
    try {
      const projs = await getProjects(app, hub.id);
      setProjects(projs);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [app, hub.id, loaded]);

  const handleToggle = () => {
    if (!expanded && !loaded) {
      loadProjects();
    }
    setExpanded(!expanded);
  };

  return (
    <TreeNode
      label={hub.name}
      icon="🏢"
      expanded={expanded}
      onToggle={handleToggle}
      level={0}
    >
      {loading && <div style={styles.loading}>Loading projects...</div>}
      {error && <div style={styles.error}>{error}</div>}
      {!loading && !error && loaded && projects.length === 0 && (
        <div style={styles.empty}>No projects found</div>
      )}
      {projects.map((project) => (
        <ProjectNode
          key={project.id}
          app={app}
          project={project}
          onViewElementGroup={onViewElementGroup}
        />
      ))}
    </TreeNode>
  );
}

// ============================================================================
// Hub Browser Component
// ============================================================================

interface HubBrowserProps {
  app: App;
  onViewElementGroup: (elementGroup: ElementGroup) => void;
}

export function HubBrowser({ app, onViewElementGroup }: HubBrowserProps) {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHubs() {
      setLoading(true);
      setError(null);
      try {
        const hubList = await getHubs(app);
        setHubs(hubList);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load hubs");
      } finally {
        setLoading(false);
      }
    }
    loadHubs();
  }, [app]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Autodesk Construction Cloud</h2>
        <p style={styles.subtitle}>Browse hubs, projects, and models — select a model to open in the external viewer</p>
      </div>
      
      <div style={styles.treeContainer}>
        {loading && <div style={styles.loading}>Loading hubs...</div>}
        {error && <div style={styles.error}>{error}</div>}
        {!loading && !error && hubs.length === 0 && (
          <div style={styles.empty}>No hubs found</div>
        )}
        {hubs.map((hub) => (
          <HubNode
            key={hub.id}
            app={app}
            hub={hub}
            onViewElementGroup={onViewElementGroup}
          />
        ))}
      </div>
    </div>
  );
}

export default HubBrowser;
