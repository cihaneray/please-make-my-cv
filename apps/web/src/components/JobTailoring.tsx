"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useCopy } from "@/lib/copy";
import type { JobApplication, TailoringPlan } from "@/lib/types";

export function JobTailoring({
  job,
  dirty,
}: {
  job: JobApplication;
  dirty: boolean;
}) {
  const copy = useCopy();
  const [plan, setPlan] = useState<TailoringPlan | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const stale =
    plan &&
    (plan.resumeId !== job.linkedResumeId ||
      plan.jobUpdatedAt !== job.updatedAt);
  async function generate() {
    setBusy(true);
    setError("");
    setCreated(null);
    setPlan(null);
    try {
      const result = await api.planTailoring(job.id, job.linkedResumeId!);
      setPlan(result);
      setSelected(result.candidates.map((item) => item.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="dossier-tailoring"
      aria-label={copy("Tailor CV to this job")}
    >
      <h3>{copy("Tailor CV to this job")}</h3>
      <p>
        {copy(
          "Highlight existing evidence in a new CV copy. No skills or achievements are invented; the original stays unchanged.",
        )}
      </p>
      {dirty && (
        <p>{copy("Save job changes before generating suggestions.")}</p>
      )}
      <button
        className="editorial-button"
        disabled={busy || dirty || !job.linkedResumeId}
        onClick={generate}
      >
        {copy(busy ? "Preparing suggestions…" : "Suggest relevant bullets")}
      </button>
      {plan && !stale && (
        <>
          {!plan.candidates.length && (
            <p>
              {copy(
                "No existing bullets match these requirements. Review the job requirements or CV evidence.",
              )}
            </p>
          )}
          <div className="tailoring-candidates">
            {plan.candidates.map((item) => (
              <label key={item.id}>
                <input
                  type="checkbox"
                  disabled={busy || dirty}
                  checked={selected.includes(item.id)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, item.id]
                        : selected.filter((id) => id !== item.id),
                    )
                  }
                />
                <span>
                  <small>
                    {item.entryTitle} · {item.requirements.join(", ")}
                  </small>
                  <span>{item.text}</span>
                </span>
              </label>
            ))}
          </div>
          {!!plan.missingRequirements.length && (
            <div className="dossier-gaps">
              <strong>{copy("Requirements without CV evidence")}</strong>
              <p>
                {copy(
                  "These are wording gaps, not proof that you lack the skill. Add details only if you can verify them.",
                )}
              </p>
              {plan.missingRequirements.map((term) => (
                <span className="requirement-gap" key={term}>
                  {term}
                </span>
              ))}
            </div>
          )}
          {!!plan.candidates.length && (
            <>
              <p>
                {copy(
                  "Selected bullets and their entries move to the top. All existing content is preserved.",
                )}
              </p>
              <button
                className="editorial-button primary"
                disabled={busy || dirty || !selected.length || !!created}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const result = await api.applyTailoring(
                      job.id,
                      plan.resumeId,
                      {
                        revision: plan.revision,
                        jobUpdatedAt: plan.jobUpdatedAt,
                        selected,
                      },
                    );
                    setCreated(result.metadata.id);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {copy("Create tailored CV copy")}
              </button>
            </>
          )}
        </>
      )}
      {stale && (
        <p>{copy("The linked CV or job changed. Generate new suggestions.")}</p>
      )}
      {created && (
        <a className="editorial-link" href={`/resumes/${created}`}>
          {copy("Open tailored CV")}
        </a>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
