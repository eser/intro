import { useState, useEffect, useRef, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import defaultConfig from "../../config.json";

export const Route = createFileRoute("/config")({
  component: ConfigPage,
  head: () => ({
    meta: [{ title: "Config - intro" }],
    scripts: [
      {
        src: "https://challenges.cloudflare.com/turnstile/v0/api.js",
        async: true,
        defer: true,
      },
    ],
  }),
});

interface AuthState {
  authenticated: boolean;
  adminExists: boolean;
  username: string | null;
}

function ConfigPage() {
  const [state, setState] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth-state");
      const result = (await res.json()) as AuthState;
      setState(result);
    } catch {
      setState({ authenticated: false, adminExists: true, username: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading || !state) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <span style={{ color: "#888" }}>Loading...</span>
        </div>
      </div>
    );
  }

  if (!state.adminExists) {
    return <SetupForm onComplete={checkAuth} />;
  }

  if (!state.authenticated) {
    return <LoginForm onComplete={checkAuth} />;
  }

  return <ConfigEditor username={state.username!} onLogout={checkAuth} />;
}

interface TurnstileApi {
  render: (
    el: HTMLElement,
    opts: { sitekey: string; callback: (token: string) => void },
  ) => string;
  remove: (id: string) => void;
}

function TurnstileWidget({ onToken }: { onToken: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;
    if (!siteKey || !containerRef.current) return;

    const interval = setInterval(() => {
      const turnstile = (window as unknown as Record<string, unknown>)
        .turnstile as TurnstileApi | undefined;
      if (turnstile && containerRef.current) {
        clearInterval(interval);
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: onToken,
        });
      }
    }, 100);

    return () => {
      clearInterval(interval);
      const turnstile = (window as unknown as Record<string, unknown>)
        .turnstile as TurnstileApi | undefined;
      if (turnstile && widgetIdRef.current) {
        turnstile.remove(widgetIdRef.current);
      }
    };
  }, [onToken]);

  return <div ref={containerRef} style={{ margin: "12px 0" }} />;
}

function SetupForm({ onComplete }: { onComplete: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, turnstileToken }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Setup failed");
        return;
      }
      onComplete();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h2 style={styles.heading}>Create Admin Account</h2>
        <input
          style={styles.input}
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <TurnstileWidget onToken={setTurnstileToken} />
        {error && <div style={styles.error}>{error}</div>}
        <button style={styles.button} type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create Admin"}
        </button>
      </form>
    </div>
  );
}

function LoginForm({ onComplete }: { onComplete: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, turnstileToken }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      onComplete();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h2 style={styles.heading}>Admin Login</h2>
        <input
          style={styles.input}
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <TurnstileWidget onToken={setTurnstileToken} />
        {error && <div style={styles.error}>{error}</div>}
        <button style={styles.button} type="submit" disabled={submitting}>
          {submitting ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

function ConfigEditor({
  username,
  onLogout,
}: {
  username: string;
  onLogout: () => void;
}) {
  const [configJson, setConfigJson] = useState("");
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        setConfigJson(JSON.stringify(data, null, 2));
        setLoading(false);
      })
      .catch(() => {
        setConfigJson(JSON.stringify(defaultConfig, null, 2));
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setStatus(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(configJson);
    } catch {
      setStatus({ type: "error", message: "Invalid JSON syntax" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/config-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: parsed }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setStatus({ type: "error", message: data.error ?? "Save failed" });
        return;
      }
      setStatus({ type: "success", message: "Config saved" });
    } catch {
      setStatus({ type: "error", message: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfigJson(JSON.stringify(defaultConfig, null, 2));
    setStatus(null);
  };

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    onLogout();
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(configJson);
      setConfigJson(JSON.stringify(parsed, null, 2));
      setStatus(null);
    } catch {
      setStatus({ type: "error", message: "Cannot format: invalid JSON" });
    }
  };

  return (
    <div style={styles.container}>
      <div style={{ ...styles.card, maxWidth: 900 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h2 style={styles.heading}>Config Editor</h2>
          <span style={{ color: "#888", fontSize: 14 }}>
            Logged in as <strong>{username}</strong>
          </span>
        </div>

        {loading ? (
          <div style={{ color: "#888" }}>Loading config...</div>
        ) : (
          <>
            <textarea
              style={styles.textarea}
              value={configJson}
              onChange={(e) => {
                setConfigJson(e.target.value);
                setStatus(null);
              }}
              spellCheck={false}
            />

            {status && (
              <div
                style={{
                  ...styles.error,
                  color: status.type === "success" ? "#4caf50" : "#ef5350",
                }}
              >
                {status.message}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={styles.button}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                style={{ ...styles.button, background: "#555" }}
                onClick={handleFormat}
              >
                Format
              </button>
              <button
                style={{ ...styles.button, background: "#555" }}
                onClick={handleReset}
              >
                Reset to Defaults
              </button>
              <div style={{ flex: 1 }} />
              <button
                style={{ ...styles.button, background: "#8b0000" }}
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "#111",
    padding: 20,
  },
  card: {
    background: "#1a1a2e",
    borderRadius: 12,
    padding: 32,
    width: "100%",
    maxWidth: 420,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
  },
  heading: {
    color: "#e0e0e0",
    fontSize: 22,
    fontWeight: 600,
    margin: 0,
  },
  input: {
    background: "#0f0f23",
    border: "1px solid #333",
    borderRadius: 6,
    padding: "10px 14px",
    color: "#e0e0e0",
    fontSize: 15,
    outline: "none",
    fontFamily: "inherit",
  },
  textarea: {
    background: "#0f0f23",
    border: "1px solid #333",
    borderRadius: 6,
    padding: "12px 14px",
    color: "#e0e0e0",
    fontSize: 13,
    fontFamily: "'Fira Code', 'Consolas', monospace",
    lineHeight: 1.5,
    minHeight: 500,
    resize: "vertical",
    outline: "none",
    whiteSpace: "pre",
    tabSize: 2,
  },
  button: {
    background: "#6c63ff",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "10px 20px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
  error: {
    color: "#ef5350",
    fontSize: 14,
  },
};
