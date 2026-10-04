"use client";
import { useCopy } from "@/lib/copy";
import { useEffect, useState } from "react";
import { aiApi, AIConnection } from "@/lib/api";
export function AISettings() {
  const copy = useCopy();
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
      className="workspace-tools bg-surface-container-lowest rounded-xl border p-6 mb-6 space-y-4"
      aria-label={copy("LLM connection settings")}
    >
      <h2 className="text-lg font-semibold">{copy("LLM connection")}</h2>
      <p className="text-sm">
        {copy(
          "Connect Gemini, an OpenAI-compatible API, or local Ollama. Resume reviews run only when you request them in Review. The selected server receives resume content and optional job text; cloud providers may charge for requests.",
        )}
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
            {copy("Enable AI reviews")}
          </label>
          <label className="block">
            {copy("Provider")}
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
                      : provider === "gemini"
                        ? "https://generativelanguage.googleapis.com/v1beta"
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
              <option value="gemini">Google Gemini</option>
            </select>
          </label>
          <label className="block">
            {copy("API base URL")}
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
            {copy("Model ID")}
            <input
              className="block w-full"
              placeholder={copy(
                config.provider === "gemini"
                  ? "Enter your Gemini model ID"
                  : "Enter an available model ID",
              )}
              value={config.model}
              onChange={(e) => {
                setConfig({ ...config, model: e.target.value });
                setDirty(true);
              }}
            />
          </label>
          <label className="block">
            {copy(
              config.provider === "gemini"
                ? "Gemini API key"
                : "API key (optional for local servers)",
            )}
            <input
              className="block w-full"
              type="password"
              autoComplete="new-password"
              value={key}
              placeholder={copy(
                config.hasApiKey
                  ? "Stored on backend; leave blank to keep"
                  : "No key stored",
              )}
              onChange={(e) => {
                setKey(e.target.value);
                setDirty(true);
              }}
            />
          </label>
          {config.provider === "gemini" && (
            <p className="text-sm">
              {copy(
                "Use a Gemini API key and model ID from Google AI Studio. The default URL connects to the Gemini Developer API.",
              )}
            </p>
          )}
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={clear}
              onChange={(e) => {
                setClear(e.target.checked);
                setDirty(true);
              }}
            />
            {copy("Remove stored key")}
          </label>
          <p className="text-xs">
            {copy(
              "Keys are stored in the backend settings file, excluded from workspace backups, and never returned to this page. Protect that file with your OS account permissions. Changing provider or URL clears the old key unless you enter a replacement. In Docker, use http://host.docker.internal:11434 for host Ollama.",
            )}
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
              {copy("Save connection")}
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
              {copy("Test saved connection")}
            </button>
          </div>
          {dirty && (
            <p className="text-xs">{copy("Save changes before testing.")}</p>
          )}
        </>
      )}
      <p role="status">{copy(busy ? "Working…" : message)}</p>
    </section>
  );
}
