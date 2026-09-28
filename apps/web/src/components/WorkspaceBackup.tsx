"use client";
import { useCopy } from "@/lib/copy";
import React, { useState } from "react";
export function WorkspaceBackup() {
  const copy = useCopy();

  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="workspace-tools border rounded-xl bg-surface-container-lowest p-4 space-y-3">
      <h2> {copy("Workspace backup and restore")} </h2>
      <p>
        {" "}
        {copy(
          "Includes resumes, jobs, library, revision history and submitted snapshots. Keep backups private. Restore adds copies and preserves existing records.",
        )}{" "}
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const response = await fetch("/api/workspace/backup");
            if (!response.ok) throw new Error("Backup failed");
            const url = URL.createObjectURL(await response.blob());
            const a = document.createElement("a");
            a.href = url;
            a.download = "cv-workspace-backup.json";
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
            if (file.size > 5 * 1024 * 1024) {
              setStatus("Maximum backup size is 5 MB.");
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
              const response = await fetch("/api/workspace/restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: await file.text(),
              });
              const result = await response.json();
              if (!response.ok)
                throw new Error(
                  JSON.stringify(result.detail || result.error || result),
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
