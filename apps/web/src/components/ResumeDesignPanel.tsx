"use client";
import { ResumeDocument } from "@/lib/types";
import { useCopy } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
import { Icons } from "@/components/Icons";
import { SectionOrderEditor } from "@/components/SectionOrderEditor";
import { PageFitAssistant } from "@/components/PageFitAssistant";
import { TargetMarketSelector } from "@/components/TargetMarketSelector";
import { SelectMenu } from "@/components/SelectMenu";
export function ResumeDesignPanel({
  doc,
  setDoc,
  onSave,
}: {
  doc: ResumeDocument;
  setDoc: (doc: ResumeDocument) => void;
  onSave: () => void;
}) {
  const { t } = useI18n();
  const copy = useCopy();
  const updateField = (_: "design", design: ResumeDocument["design"]) =>
    setDoc({ ...doc, design });
  return (
    <div className="inspector-mode flex flex-1 w-full overflow-hidden">
      <div className="studio-form w-[420px] bg-surface-container-lowest p-space-xl flex flex-col gap-space-lg overflow-y-auto border-r border-surface-container-high no-print">
        <SectionOrderEditor document={doc} onChange={setDoc} />
        <PageFitAssistant document={doc} onChange={setDoc} />
        <span className="font-headline-md text-headline-md text-on-surface font-semibold">
          {t("designAndTypography")}
        </span>
        {/* Localization & Target Market (Decoupled Variables) */}
        <div className="flex flex-col gap-3 p-3.5 rounded-lg bg-surface-container-low border border-surface-container-highest">
          <span className="font-headline-sm font-semibold text-on-surface flex items-center gap-1.5">
            <Icons.Language size={16} />
            <span>{t("localizationTitle")}</span>
          </span>
          <p className="text-[11px] text-on-surface-variant leading-relaxed bg-surface-container p-2 rounded border border-surface-container-high">
            {t("marketNotice")}
          </p>
          {/* CV Content Language */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-secondary">
              {t("cvLanguageLabel")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { code: "en", label: "English" },
                { code: "tr", label: "Türkçe" },
              ].map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setDoc({
                      ...doc,
                      metadata: {
                        ...doc.metadata,
                        language: lang.code,
                      },
                    });
                  }}
                  className={`p-2 rounded border text-label-md transition-all ${
                    (doc.metadata.language || "en") === lang.code
                      ? "border-primary bg-primary text-on-primary font-semibold"
                      : "border-surface-container-highest bg-surface-container text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
          {/* Target Market */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-secondary">
              {t("targetMarketLabel")}
            </label>
            <TargetMarketSelector
              label={t("targetMarketLabel")}
              value={doc.metadata.targetMarket || "TR"}
              options={{
                TR: t("marketTR"),
                US: t("marketUS"),
                UK: t("marketUK"),
                EU: t("marketEU"),
                GLOBAL: t("marketGlobal"),
                OTHER: t("marketOther"),
              }}
              onChange={(targetMarket) => {
                setDoc({
                  ...doc,
                  metadata: {
                    ...doc.metadata,
                    targetMarket,
                  },
                });
              }}
            />
          </div>
        </div>
        {/* Template */}
        <div className="flex flex-col gap-2">
          <label className="font-label-sm text-secondary">
            {t("visualTemplate")}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["minimal", "technical", "professional", "classic"] as const).map(
              (tCode) => (
                <button
                  key={tCode}
                  type="button"
                  onClick={() => {
                    updateField("design", {
                      ...doc.design,
                      template: tCode,
                    });
                  }}
                  className={`p-2.5 rounded-lg border text-label-md capitalize transition-all ${
                    doc.design.template === tCode
                      ? "border-primary bg-primary text-on-primary font-semibold"
                      : "border-surface-container-highest bg-surface-container-low text-on-surface hover:bg-surface-container"
                  }`}
                >
                  {tCode}
                </button>
              ),
            )}
          </div>
        </div>
        {/* Accent Color */}
        <div className="flex flex-col gap-2">
          <label className="font-label-sm text-secondary">
            {t("accentColor")}
          </label>
          <div className="flex items-center gap-3">
            {[
              "#0F172A",
              "#16A34A",
              "#2563EB",
              "#7C3AED",
              "#DC2626",
              "#B45309",
            ].map((col) => (
              <button
                key={col}
                aria-label={`${t("accentColor")} ${col}`}
                aria-pressed={doc.design.accentColor === col}
                type="button"
                onClick={() =>
                  updateField("design", {
                    ...doc.design,
                    accentColor: col,
                  })
                }
                className={`w-7 h-7 rounded-full transition-transform ${
                  doc.design.accentColor === col
                    ? "scale-125 ring-2 ring-primary ring-offset-2"
                    : ""
                }`}
                style={{ backgroundColor: col }}
              />
            ))}
          </div>
        </div>
        {/* Font Family */}
        <div className="flex flex-col gap-2">
          <label className="font-label-sm text-secondary">
            {t("fontFamily")}
          </label>
          <SelectMenu
            aria-label={t("fontFamily")}
            value={doc.design.fontFamily}
            onValueChange={(value) =>
              updateField("design", {
                ...doc.design,
                fontFamily: value,
              })
            }
            className="h-9 px-3 rounded-lg bg-surface-container-low text-body-md border border-surface-container-highest"
          >
            <option value="Inter">{copy("Inter (Swiss Clean)")}</option>
            <option value="Helvetica Neue">
              {copy("Helvetica Neue (Modernist)")}
            </option>
            <option value="Georgia">{copy("Georgia (Editorial Serif)")}</option>
            <option value="Menlo">{copy("Menlo (Monospace / Tech)")}</option>
          </SelectMenu>
        </div>
        <button
          type="button"
          onClick={() => onSave()}
          className="editorial-button primary design-save-button"
        >
          <Icons.Save size={17} />
          {t("saveDesign")}
        </button>
      </div>
    </div>
  );
}
