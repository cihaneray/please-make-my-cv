"use client";
import { useEffect, useState } from "react";
import { aiApi, AIConnection } from "@/lib/api";
export function AISettings() {
  const [config, setConfig] = useState<AIConnection | null>(null);
  const [key, setKey] = useState("");
  const [clear, setClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    aiApi
      .settings()
      .then(setConfig)
      .catch((e) => setMessage(e.message));
  }, []);
  return (
    <section
      className="workspace-tools bg-white rounded-xl border p-6 mb-6 space-y-4"
      aria-label="LLM connection settings"
    >
      <h2 className="text-lg font-semibold">LLM connection</h2>
      <p className="text-sm">
        Connect an OpenAI-compatible API or local Ollama. Resume reviews run
        only when you request them in Review. The selected server receives
        resume content and optional job text; cloud providers may charge for
        requests.
      </p>
      {config && (
        <>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => {
                setConfig({ ...config, enabled: e.target.checked });
                setDirty(true);
              }}
            />
            Enable AI reviews
          </label>
          <label className="block">
            Provider
            <select
              aria-label="Provider"
              className="block w-full"
              value={config.provider}
              onChange={(e) => {
                const provider = e.target.value as AIConnection["provider"];
                setConfig({
                  ...config,
                  provider,
                  baseUrl:
                    provider === "ollama"
                      ? "http://localhost:11434"
                      : "https://api.openai.com/v1",
                  model: "",
                  hasApiKey: false,
                });
                setKey("");
                setClear(false);
                setDirty(true);
              }}
            >
              <option value="openai-compatible">OpenAI-compatible</option>
              <option value="ollama">Ollama</option>
            </select>
          </label>
          <label className="block">
            API base URL
            <input
              className="block w-full"
              value={config.baseUrl}
              onChange={(e) => {
                setConfig({ ...config, baseUrl: e.target.value });
                setDirty(true);
              }}
            />
          </label>
          <label className="block">
            Model ID
            <input
              className="block w-full"
              placeholder="Enter an available model ID"
              value={config.model}
              onChange={(e) => {
                setConfig({ ...config, model: e.target.value });
                setDirty(true);
              }}
            />
          </label>
          <label className="block">
            API key (optional for local servers)
            <input
              className="block w-full"
              type="password"
              autoComplete="new-password"
              value={key}
              placeholder={
                config.hasApiKey
                  ? "Stored on backend; leave blank to keep"
                  : "No key stored"
              }
              onChange={(e) => {
                setKey(e.target.value);
                setDirty(true);
              }}
            />
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={clear}
              onChange={(e) => {
                setClear(e.target.checked);
                setDirty(true);
              }}
            />
            Remove stored key
          </label>
          <p className="text-xs">
            Keys are stored in the backend settings file, excluded from
            workspace backups, and never returned to this page. Protect that
            file with your OS account permissions. Changing provider or URL
            clears the old key unless you enter a replacement. In Docker, use
            http://host.docker.internal:11434 for host Ollama.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setMessage("");
                try {
                  const { hasApiKey: _has, ...value } = config;
                  setConfig(
                    await aiApi.save({
                      ...value,
                      ...(key ? { apiKey: key } : {}),
                      clearApiKey: clear,
                    }),
                  );
                  setKey("");
                  setClear(false);
                  setDirty(false);
                  setMessage("Connection settings saved.");
                } catch (e) {
                  setMessage((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save connection
            </button>
            <button
              disabled={busy || dirty || !config.enabled}
              onClick={async () => {
                setBusy(true);
                setMessage("");
                try {
                  setMessage((await aiApi.test()).message);
                } catch (e) {
                  setMessage((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Test saved connection
            </button>
          </div>
          {dirty && <p className="text-xs">Save changes before testing.</p>}
        </>
      )}
      <p role="status">{busy ? "Working…" : message}</p>
    </section>
  );
}
