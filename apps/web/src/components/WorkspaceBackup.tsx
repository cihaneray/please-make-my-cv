"use client";
import { useCopy } from "@/lib/copy";
import React, { useEffect, useState } from "react";
export function WorkspaceBackup() {
  const copy = useCopy();

  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [maxBytes, setMaxBytes] = useState(5 * 1024 * 1024);
  useEffect(() => {
    let active = true;
    fetch("/api/health")
      .then((response) => response.json())
      .then((value) => {
        if (
          active &&
          Number.isSafeInteger(value.maxUploadSizeBytes) &&
          value.maxUploadSizeBytes > 0
        )
          setMaxBytes(value.maxUploadSizeBytes);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return (
    <section
      aria-label={copy("Workspace backup and restore")}
      className="workspace-tools border rounded-xl bg-surface-container-lowest p-4 space-y-3"
    >
      <h2> {copy("Workspace backup and restore")} </h2>
      <p>
        {" "}
        {copy(
          "Includes resumes, jobs, library, revision history and submitted snapshots. Keep backups private. Restore adds copies and preserves existing records.",
        )}{" "}
      </p>
      <label className="block">
        {copy("Backup password (at least 12 characters)")}
        <input
          type="password"
          autoComplete="new-password"
          maxLength={1024}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
        />
      </label>
      <p>
        {copy(
          "A password encrypts the backup. Keep it safe: it cannot be recovered. Leave empty for a plain JSON backup.",
        )}
      </p>
      <button
        disabled={busy || (!!password && password.length < 12)}
        onClick={async () => {
          setBusy(true);
          try {
            const response = await fetch(
              password
                ? "/api/workspace/backup/encrypted"
                : "/api/workspace/backup",
              password
                ? {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ password }),
                  }
                : undefined,
            );
            if (!response.ok) {
              const result = await response.json();
              throw new Error(result.error?.message || "Backup failed");
            }
            const url = URL.createObjectURL(await response.blob());
            const a = document.createElement("a");
            a.href = url;
            a.download = password
              ? "cv-workspace-backup.encrypted.json"
              : "cv-workspace-backup.json";
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setStatus("Backup downloaded.");
          } catch (e) {
            setStatus((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {" "}
        {copy("Download workspace backup")}{" "}
      </button>
      <label className="block">
        {" "}
        {copy("Restore backup")}{" "}
        <input
          type="file"
          accept=".json"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > maxBytes) {
              setStatus(
                `${copy("Maximum backup size")}: ${maxBytes / 1024 / 1024} MB.`,
              );
              return;
            }
            if (
              !confirm(
                "Add the backup contents as new records? Existing records will remain unchanged.",
              )
            )
              return;
            setBusy(true);
            try {
              const text = await file.text();
              const envelope = JSON.parse(text);
              const encrypted = envelope.format === "cv-workspace-encrypted-v1";
              if (encrypted && password.length < 12)
                throw new Error(
                  copy("Enter the backup password before restoring."),
                );
              const response = await fetch(
                encrypted
                  ? "/api/workspace/restore/encrypted"
                  : "/api/workspace/restore",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: encrypted
                    ? JSON.stringify({ password, envelope })
                    : text,
                },
              );
              const result = await response.json();
              if (!response.ok)
                throw new Error(
                  result.error?.message ||
                    JSON.stringify(result.detail || result),
                );
              setStatus(result.message);
            } catch (err) {
              setStatus((err as Error).message);
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </label>
      <p role="status">{status}</p>
    </section>
  );
}
