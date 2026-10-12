"use client";
import { useCopy } from "@/lib/copy";
import { useEffect, useState } from "react";
import { aiApi, AIConnection } from "@/lib/api";
import { SelectMenu } from "@/components/SelectMenu";
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
  const modelMissing = !!config?.enabled && !config.model.trim();
  return (
    <section
      className="workspace-tools ai-settings"
      aria-label={copy("LLM connection settings")}
    >
      <header className="ai-settings-header">
        <h2>{copy("LLM connection")}</h2>
        {config && (
          <span className="ai-connection-state">
            {copy(config.enabled ? "AI enabled" : "AI disabled")}
          </span>
        )}
      </header>
      <p className="ai-settings-description">
        {copy(
          "Connect Gemini, an OpenAI-compatible API, or local Ollama. Resume reviews run only when you request them in Review. The selected server receives resume content and optional job text; cloud providers may charge for requests.",
        )}
      </p>
      {config && (
        <fieldset className="ai-settings-form" disabled={busy}>
          <label className="ai-settings-toggle">
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
          <div className="ai-settings-fields">
            <label className="ai-settings-field">
              <span>{copy("Provider")}</span>
              <SelectMenu
                aria-label={copy("Provider")}
                className="block w-full"
                value={config.provider}
                onValueChange={(value) => {
                  const provider = value as AIConnection["provider"];
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
                <option value="openai-compatible">
                  {copy("OpenAI-compatible")}
                </option>
                <option value="ollama">Ollama</option>
                <option value="gemini">Google Gemini</option>
              </SelectMenu>
            </label>
            <label className="ai-settings-field">
              <span>{copy("Model ID")}</span>
              <input
                className="block w-full"
                placeholder={copy(
                  config.provider === "gemini"
                    ? "Enter your Gemini model ID"
                    : "Enter an available model ID",
                )}
                aria-invalid={modelMissing}
                aria-describedby={modelMissing ? "ai-model-hint" : undefined}
                value={config.model}
                onChange={(e) => {
                  setConfig({ ...config, model: e.target.value });
                  setDirty(true);
                }}
              />
              {modelMissing && (
                <small id="ai-model-hint">
                  {copy("Enter a model ID to enable AI reviews.")}
                </small>
              )}
            </label>
            <label className="ai-settings-field ai-settings-wide">
              <span>{copy("API base URL")}</span>
              <input
                className="block w-full"
                value={config.baseUrl}
                onChange={(e) => {
                  setConfig({
                    ...config,
                    baseUrl: e.target.value,
                    hasApiKey: false,
                  });
                  setClear(false);
                  setDirty(true);
                }}
              />
            </label>
            <label className="ai-settings-field ai-settings-wide">
              <span>
                {copy(
                  config.provider === "gemini"
                    ? "Gemini API key"
                    : "API key (optional for local servers)",
                )}
              </span>
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
          </div>
          {config.provider === "gemini" && (
            <p className="ai-settings-hint">
              {copy(
                "Use a Gemini API key and model ID from Google AI Studio. The default URL connects to the Gemini Developer API.",
              )}
            </p>
          )}
          {config.hasApiKey && (
            <label className="ai-settings-toggle">
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
          )}
          <p className="ai-settings-hint">
            {copy(
              "Saved keys are encrypted on the backend and excluded from workspace backups. Leave the key field blank to keep it. Changing provider or URL clears the old key unless you enter a replacement. In Docker, use http://host.docker.internal:11434 for host Ollama.",
            )}
          </p>
          <div className="ai-settings-actions">
            <button
              className="ai-save-connection"
              disabled={busy || modelMissing}
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
        </fieldset>
      )}
      <p className="ai-settings-status" role="status">
        {copy(busy ? "Working…" : message)}
      </p>
    </section>
  );
}
