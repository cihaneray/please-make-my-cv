"use client";
import { useI18n } from "@/lib/i18n";
import { useCopy } from "@/lib/copy";
import { Icons } from "@/components/Icons";
import { AIResumeReview } from "@/components/AIResumeReview";
import { applyAIEdit } from "@/lib/ai-edits";
import {
  AnalysisIssue,
  ResumeAnalysisReport,
  ResumeDocument,
} from "@/lib/types";
import { Dispatch, SetStateAction } from "react";
export function ResumeReviewPanel({
  doc,
  setDoc,
  disabled,
  analyzing,
  analysisReport,
}: {
  doc: ResumeDocument;
  setDoc: Dispatch<SetStateAction<ResumeDocument | null>>;
  disabled: boolean;
  analyzing: boolean;
  analysisReport: ResumeAnalysisReport | null;
}) {
  const { t } = useI18n();
  const copy = useCopy();
  return (
    <div className="inspector-mode flex flex-1 w-full overflow-hidden">
      <div className="studio-form w-[450px] bg-surface-container-lowest p-space-xl flex flex-col gap-space-lg overflow-y-auto border-r border-surface-container-high no-print">
        <span className="font-headline-md text-headline-md text-on-surface font-semibold">
          {t("atsReview")}
        </span>
        <AIResumeReview
          key={doc.metadata.id}
          document={doc}
          disabled={disabled}
          onApply={(edit) =>
            setDoc((current) =>
              current ? applyAIEdit(current, edit) : current,
            )
          }
        />
        {analyzing ? (
          <div className="text-secondary text-sm">{t("evaluatingRules")}</div>
        ) : analysisReport ? (
          <div className="flex flex-col gap-space-lg">
            <div className="local-review-explanation">
              <h3>{copy("Local rule checks")}</h3>
              <p>
                {copy(
                  "These checks run locally without AI. They check document structure, contact details, duplicate or long bullets and other predefined rules. AI wording suggestions above are separate.",
                )}
              </p>
              <details>
                <summary>{copy("How are these scores calculated?")}</summary>
                <p>
                  {copy(
                    "ATS score = earned points ÷ 80 × 100. Job relevance is excluded here. Missing email subtracts 10 contact points; missing phone subtracts 5. Other rule findings reduce their related dimension.",
                  )}
                </p>
                <p>
                  {copy(
                    "Content quality starts at 100 and deducts 15/10/5/2 for critical/important/warning/info findings in experience, projects or summary. A score of 100 only means these rules found no issues; it does not mean the text cannot be improved.",
                  )}
                </p>
              </details>
            </div>
            {/* Score Pill Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-surface-container-low flex flex-col">
                <span className="text-[11px] text-secondary uppercase font-semibold">
                  {t("atsCompatibility")}
                </span>
                <span className="text-[22px] font-bold text-on-tertiary-container">
                  {analysisReport.atsCompatibilityScore}%
                </span>
              </div>
              <div className="p-3 rounded-lg bg-surface-container-low flex flex-col">
                <span className="text-[11px] text-secondary uppercase font-semibold">
                  {t("contentQuality")}
                </span>
                <span className="text-[22px] font-bold text-primary">
                  {analysisReport.contentQualityScore}%
                </span>
              </div>
            </div>
            {/* Transparent ATS Heuristic Score Breakdown */}
            {analysisReport.atsBreakdown && (
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-surface-container-low border border-surface-container-highest">
                <span className="font-label-sm text-secondary uppercase tracking-wider font-semibold">
                  {t("scoreBreakdownTitle")}
                </span>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="flex justify-between p-1.5 rounded bg-surface-container-lowest">
                    <span className="text-secondary">
                      {t("breakdownStructure")}
                    </span>
                    <span className="font-semibold text-on-surface">
                      {analysisReport.atsBreakdown.structure} / 20
                    </span>
                  </div>
                  <div className="flex justify-between p-1.5 rounded bg-surface-container-lowest">
                    <span className="text-secondary">
                      {t("breakdownReadability")}
                    </span>
                    <span className="font-semibold text-on-surface">
                      {analysisReport.atsBreakdown.readability} / 20
                    </span>
                  </div>
                  <div className="flex justify-between p-1.5 rounded bg-surface-container-lowest">
                    <span className="text-secondary">
                      {t("breakdownContact")}
                    </span>
                    <span className="font-semibold text-on-surface">
                      {analysisReport.atsBreakdown.contact} / 15
                    </span>
                  </div>
                  <div className="flex justify-between p-1.5 rounded bg-surface-container-lowest">
                    <span className="text-secondary">
                      {t("breakdownConsistency")}
                    </span>
                    <span className="font-semibold text-on-surface">
                      {analysisReport.atsBreakdown.consistency} / 15
                    </span>
                  </div>
                  <div className="flex justify-between p-1.5 rounded bg-surface-container-lowest">
                    <span className="text-secondary">
                      {t("breakdownJobRelevance")}
                    </span>
                    <span className="font-semibold text-on-surface">
                      {analysisReport.atsBreakdown.job_relevance == null
                        ? copy("Not assessed")
                        : `${analysisReport.atsBreakdown.job_relevance} / 20`}
                    </span>
                  </div>
                  <div className="flex justify-between p-1.5 rounded bg-surface-container-lowest">
                    <span className="text-secondary">
                      {t("breakdownParseability")}
                    </span>
                    <span className="font-semibold text-on-surface">
                      {analysisReport.atsBreakdown.parseability} / 10
                    </span>
                  </div>
                </div>
                {analysisReport.heuristicNotice && (
                  <p className="text-[11px] text-secondary italic pt-1">
                    {copy(analysisReport.heuristicNotice)}
                  </p>
                )}
              </div>
            )}
            {/* Strengths */}
            {analysisReport.strengths.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="font-label-sm text-secondary uppercase tracking-wider">
                  {t("strengths")}
                </span>
                {analysisReport.strengths.map((str, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-[12px] text-on-surface"
                  >
                    <Icons.CheckCircle
                      size={15}
                      className="text-on-tertiary-container"
                    />
                    <span>{str}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Issues */}
            <div className="flex flex-col gap-2">
              <span className="font-label-sm text-secondary uppercase tracking-wider">
                {copy("Rule findings")} ({analysisReport.issues.length})
              </span>
              {analysisReport.issues.length === 0 && (
                <p className="text-xs text-secondary">
                  {copy(
                    "No local rule findings. AI may still suggest wording improvements or ask for missing context.",
                  )}
                </p>
              )}
              {analysisReport.issues.map(
                (issue: AnalysisIssue, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg text-[12px] flex flex-col gap-1 border ${
                      issue.severity === "critical"
                        ? "bg-error-container border-error/20 text-on-error-container"
                        : issue.severity === "warning"
                          ? "bg-amber-50 border-amber-200 text-amber-900"
                          : "bg-surface-container-low border-surface-container-highest text-on-surface"
                    }`}
                  >
                    <div className="font-semibold flex items-center justify-between">
                      <span>{issue.message}</span>
                      <span className="text-[10px] uppercase font-bold">
                        {issue.severity}
                      </span>
                    </div>
                    {issue.suggestion && (
                      <div className="text-[11px] opacity-80 pt-0.5">
                        {copy("Tip")}: {issue.suggestion}
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
