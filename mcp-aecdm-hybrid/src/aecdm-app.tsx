import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  App,
  applyDocumentTheme,
  applyHostStyleVariables,
  applyHostFonts,
} from "@modelcontextprotocol/ext-apps";
import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import { HubBrowser } from "./components/HubBrowser";
import { checkAuth, authenticate } from "./api/aecdm";
import type { AppView, ElementGroup } from "./types";

// ============================================================================
// Styles
// ============================================================================

const styles = {
  app: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },
  authScreen: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    padding: "40px",
    textAlign: "center" as const,
  },
  authTitle: {
    margin: "0 0 16px",
    fontSize: "var(--font-heading-lg-size, 24px)",
    fontWeight: "var(--font-weight-semibold, 600)" as const,
    color: "var(--color-text-primary, #1a1a1a)",
  },
  authDescription: {
    margin: "0 0 24px",
    fontSize: "var(--font-text-md-size, 16px)",
    color: "var(--color-text-secondary, #666)",
    maxWidth: "400px",
    lineHeight: 1.5,
  },
  authButton: {
    padding: "12px 24px",
    fontSize: "16px",
    fontWeight: "600" as const,
    background: "var(--color-accent-primary, #2563eb)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--border-radius-lg, 8px)",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  authButtonDisabled: {
    background: "var(--color-background-tertiary, #ccc)",
    cursor: "not-allowed",
  },
  authError: {
    marginTop: "16px",
    padding: "12px 16px",
    background: "var(--color-error-background, #fef2f2)",
    color: "var(--color-error, #dc2626)",
    borderRadius: "var(--border-radius-md, 6px)",
    fontSize: "14px",
  },
  logo: {
    width: "64px",
    height: "64px",
    marginBottom: "24px",
    background: "var(--color-accent-primary, #2563eb)",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
  },
  toast: {
    position: "fixed" as const,
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "10px 20px",
    background: "var(--color-accent-primary, #2563eb)",
    color: "#fff",
    borderRadius: "var(--border-radius-lg, 8px)",
    fontSize: "14px",
    fontWeight: "500" as const,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    zIndex: 1000,
    transition: "opacity 0.3s, transform 0.3s",
    whiteSpace: "nowrap" as const,
  },
  toastHidden: {
    opacity: 0,
    transform: "translateX(-50%) translateY(10px)",
    pointerEvents: "none" as const,
  },
};

// ============================================================================
// Tool Result Types
// ============================================================================

interface BrowseAction {
  action: "browse";
}

interface ModelSentAction {
  action: "model-sent";
  modelName: string;
  message: string;
}

type ToolAction = BrowseAction | ModelSentAction;

// ============================================================================
// Auth Screen Component
// ============================================================================

interface AuthScreenProps {
  app: App;
  onAuthenticated: () => void;
}

function AuthScreen({ app, onAuthenticated }: AuthScreenProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    setError(null);
    try {
      const result = await authenticate(app);
      if (result.authenticated) {
        onAuthenticated();
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div style={styles.authScreen}>
      <div style={styles.logo}>🏗️</div>
      <h1 style={styles.authTitle}>Autodesk Authentication Required</h1>
      <p style={styles.authDescription}>
        Sign in with your Autodesk account to browse ACC hubs, projects, and view 3D models.
        A browser window will open for secure authentication.
      </p>
      <button
        style={{
          ...styles.authButton,
          ...(isAuthenticating ? styles.authButtonDisabled : {}),
        }}
        onClick={handleAuthenticate}
        disabled={isAuthenticating}
      >
        {isAuthenticating ? "Waiting for browser login..." : "Sign in with Autodesk"}
      </button>
      {error && <div style={styles.authError}>{error}</div>}
    </div>
  );
}

// ============================================================================
// Toast Component
// ============================================================================

interface ToastProps {
  message: string | null;
}

function Toast({ message }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);

  useEffect(() => {
    if (message) {
      setDisplayMessage(message);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div
      style={{
        ...styles.toast,
        ...(visible ? {} : styles.toastHidden),
      }}
    >
      {displayMessage}
    </div>
  );
}

// ============================================================================
// Main App Component
// ============================================================================

interface MainAppProps {
  app: App;
}

function MainApp({ app }: MainAppProps) {
  const [view, setView] = useState<AppView>("auth");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);

  // Check auth status on mount
  useEffect(() => {
    async function checkAuthStatus() {
      try {
        const authenticated = await checkAuth(app);
        if (authenticated) {
          setView("browser");
        } else {
          setView("auth");
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setView("auth");
      } finally {
        setIsCheckingAuth(false);
      }
    }
    checkAuthStatus();
  }, [app]);

  // Show a toast notification
  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastKey((k) => k + 1);
  }, []);

  // Handle tool results from Claude
  const handleToolResult = useCallback((result: { toolName: string; content: Array<{ type: string; text?: string }> }) => {
    console.log("Tool result received:", result.toolName);
    
    const textContent = result.content.find((c) => c.type === "text");
    if (!textContent?.text) return;

    try {
      const data = JSON.parse(textContent.text) as ToolAction;
      
      switch (data.action) {
        case "browse":
          setView("browser");
          break;
          
        case "model-sent":
          showToast(data.message);
          break;
      }
    } catch (err) {
      console.error("Failed to parse tool result:", err);
    }
  }, [showToast]);

  // Register tool result handler
  useEffect(() => {
    app.ontoolresult = handleToolResult;
  }, [app, handleToolResult]);

  // Handle element group selection from browser -> send to external viewer
  const handleViewElementGroup = useCallback(
    async (elementGroup: ElementGroup) => {
      try {
        const result = await app.callServerTool({
          name: "render-model",
          arguments: {
            fileVersionUrn: elementGroup.fileVersionUrn,
            elementGroupId: elementGroup.id,
            elementGroupName: elementGroup.name,
          },
        });

        // Parse result to show toast
        const textContent = result.content.find((c: { type: string }) => c.type === "text") as { type: string; text?: string } | undefined;
        if (textContent?.text) {
          const data = JSON.parse(textContent.text);
          if (data.message) {
            showToast(data.message);
          } else if (data.error) {
            showToast(`Error: ${data.error}`);
          }
        }

        // Push updated model context to Claude so it uses the new elementGroupId
        try {
          await app.updateModelContext({
            content: [
              {
                type: "text",
                text: `Model changed: "${elementGroup.name}". The current elementGroupId is "${elementGroup.id}". Use this elementGroupId for all subsequent AECDM GraphQL queries.`,
              },
            ],
          });
        } catch (ctxErr) {
          console.error("Failed to update model context:", ctxErr);
        }
      } catch (err) {
        console.error("Failed to send model to viewer:", err);
        showToast("Failed to send model to viewer");
      }
    },
    [app, showToast]
  );

  // Handle successful authentication
  const handleAuthenticated = () => {
    setView("browser");
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div style={styles.authScreen}>
        <div style={{ color: "var(--color-text-secondary, #666)" }}>
          Checking authentication...
        </div>
      </div>
    );
  }

  // Render current view
  return (
    <>
      {view === "auth" && (
        <AuthScreen app={app} onAuthenticated={handleAuthenticated} />
      )}
      {view === "browser" && (
        <HubBrowser app={app} onViewElementGroup={handleViewElementGroup} />
      )}
      <Toast key={toastKey} message={toastMessage} />
    </>
  );
}

// ============================================================================
// App Initialization
// ============================================================================

const appInfo = {
  name: "AECDM Browser (Hybrid)",
  version: "1.0.0",
};

function AecdmApp() {
  const [app, setApp] = useState<App | null>(null);

  useEffect(() => {
    const mcpApp = new App(appInfo);

    // Handle host context changes (theme, styles, safe area)
    mcpApp.onhostcontextchanged = (ctx: McpUiHostContext) => {
      console.log("Host context changed:", ctx);
      
      if (ctx.theme) {
        applyDocumentTheme(ctx.theme);
      }
      if (ctx.styles?.variables) {
        applyHostStyleVariables(ctx.styles.variables);
      }
      if (ctx.styles?.css?.fonts) {
        applyHostFonts(ctx.styles.css.fonts);
      }
      if (ctx.safeAreaInsets) {
        const { top, right, bottom, left } = ctx.safeAreaInsets;
        document.body.style.padding = `${top}px ${right}px ${bottom}px ${left}px`;
      }
    };

    // Handle teardown
    mcpApp.onteardown = async () => {
      console.log("App teardown");
      return {};
    };

    // Connect to host
    mcpApp.connect().then(() => {
      console.log("MCP App connected");
      setApp(mcpApp);
    });

    return () => {
      // Cleanup if needed
    };
  }, []);

  if (!app) {
    return (
      <div style={styles.authScreen}>
        <div style={{ color: "var(--color-text-secondary, #666)" }}>
          Connecting...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <MainApp app={app} />
    </div>
  );
}

// ============================================================================
// Mount React App
// ============================================================================

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<AecdmApp />);
}
