"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import {
  familyApi,
  type FamilyReport,
  type FamilyChange,
} from "@/lib/resume-family";
import type { ResumeDocument } from "@/lib/types";
import { Icons } from "./Icons";
import styles from "./ResumeFamily.module.css";

export function ResumeFamily({
  document,
  disabled,
  dirty,
}: {
  document: ResumeDocument;
  disabled: boolean;
  dirty: boolean;
}) {
  const { language } = useI18n();
  const tr = language === "tr";
  const label = (en: string, turkish: string) => (tr ? turkish : en);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useId();
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<FamilyReport | null>(null);
  const [tab, setTab] = useState<"sync" | "consistency">("sync");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overwrite, setOverwrite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const busy = loading || applying;
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const triggerElement = trigger.current;
    const controller = new AbortController();
    element?.showModal();
    const previousOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    setLoading(true);
    setError("");
    setReport(null);
    setSelected(new Set());
    setOverwrite(false);
    familyApi
      .preview(document.metadata.id, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setReport(value);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            label(
              "The CV family could not be loaded. Retry.",
              "CV ailesi yüklenemedi. Tekrar deneyin.",
            ),
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      element?.close();
      window.document.body.style.overflow = previousOverflow;
      triggerElement?.focus();
    };
    // Opening or explicitly refreshing uses the saved versions. Text edits never trigger requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, document.metadata.id, reload]);
  const fields: Record<string, string> = tr
    ? {
        profile: "Profil",
        summary: "Özet",
        experience: "İş deneyimi",
        education: "Eğitim",
        projects: "Projeler",
        skills: "Yetenekler",
        certifications: "Sertifikalar",
        languages: "Diller",
        customSections: "Özel bölümler",
        firstName: "Ad",
        lastName: "Soyad",
        headline: "Mesleki başlık",
        email: "E-posta",
        phone: "Telefon",
        location: "Konum",
        country: "Ülke",
        city: "Şehir",
        website: "Web sitesi",
        linkedin: "LinkedIn",
        github: "GitHub",
        links: "Bağlantılar",
        company: "Şirket",
        position: "Unvan",
        startDate: "Başlangıç tarihi",
        endDate: "Bitiş tarihi",
        current: "Devam ediyor",
        bullets: "Başarı maddeleri",
        technologies: "Teknolojiler",
        institution: "Kurum",
        degree: "Derece",
        fieldOfStudy: "Bölüm",
        grade: "Not",
        highlights: "Öne çıkanlar",
        name: "Ad",
        role: "Rol",
        url: "Bağlantı",
        category: "Kategori",
        issuer: "Veren kurum",
        issueDate: "Veriliş tarihi",
        expiryDate: "Geçerlilik tarihi",
        credentialId: "Belge numarası",
        credentialUrl: "Belge bağlantısı",
        language: "Dil",
        proficiency: "Seviye",
        title: "Başlık",
        items: "İçerik",
      }
    : {
        customSections: "Custom sections",
        startDate: "Start date",
        endDate: "End date",
        fieldOfStudy: "Field of study",
        issueDate: "Issue date",
        expiryDate: "Expiry date",
        credentialId: "Credential ID",
        credentialUrl: "Credential URL",
      };
  const name = (key: string) =>
    fields[key] || (tr ? "Alan" : key.replace(/([A-Z])/g, " $1"));
  function valueText(value: unknown): string {
    if (value === null || value === undefined || value === "")
      return label("Empty", "Boş");
    if (typeof value === "boolean")
      return value ? label("Yes", "Evet") : label("No", "Hayır");
    if (Array.isArray(value)) return value.map(valueText).join("\n");
    if (typeof value === "object")
      return Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== "id")
        .map(([key, val]) => `${name(key)}: ${valueText(val)}`)
        .join("\n");
    return String(value);
  }
  const choiceKey = (targetId: string, change: FamilyChange) =>
    `${targetId}:${change.id}`;
  const changeCount =
    report?.variants.reduce(
      (count, variant) => count + variant.changes.length,
      0,
    ) ?? 0;
  const choices =
    report?.variants.flatMap((variant) =>
      variant.changes
        .filter((change) => selected.has(choiceKey(variant.id, change)))
        .map((change) => ({
          targetId: variant.id,
          targetRevision: variant.revision,
          changeId: change.id,
        })),
    ) ?? [];
  function close() {
    if (!applying) setOpen(false);
  }
  return (
    <>
      <button
        ref={trigger}
        className="editorial-button"
        type="button"
        disabled={disabled}
        onClick={() => {
          setMessage("");
          setOpen(true);
        }}
      >
        <Icons.Library size={16} />
        {label("CV family", "CV ailesi")}
      </button>
      {open && (
        <dialog
          ref={dialog}
          className={styles.dialog}
          aria-labelledby={heading}
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
        >
          <header className={styles.header}>
            <div>
              <h2 id={heading}>{label("CV family", "CV ailesi")}</h2>
              <p>
                {label(
                  "Compare saved CVs and selectively update copies. No document changes until you apply.",
                  "Kaydedilmiş CV’leri karşılaştırın ve kopyaları seçerek güncelleyin. Uygulamadıkça belgeler değişmez.",
                )}
              </p>
            </div>
            <button
              type="button"
              disabled={applying}
              aria-label={label("Close CV family", "CV ailesini kapat")}
              onClick={close}
            >
              <Icons.Close size={18} />
            </button>
          </header>
          <nav
            className={styles.tabs}
            aria-label={label("Family tools", "Aile araçları")}
          >
            <button
              type="button"
              aria-pressed={tab === "sync"}
              onClick={() => setTab("sync")}
            >
              {label("Update variants", "Varyantları güncelle")}{" "}
              <span>{changeCount}</span>
            </button>
            <button
              type="button"
              aria-pressed={tab === "consistency"}
              onClick={() => setTab("consistency")}
            >
              {label("Consistency", "Tutarlılık")}{" "}
              <span>{report?.findings.length ?? 0}</span>
            </button>
          </nav>
          <div className={styles.body}>
            {dirty && (
              <p className={styles.notice} role="status">
                {label(
                  "You have unsaved edits. Save the draft and refresh this preview before applying updates.",
                  "Kaydedilmemiş düzenlemeler var. Güncellemeden önce taslağı kaydedip bu önizlemeyi yenileyin.",
                )}
              </p>
            )}
            {busy && (
              <p role="status">
                {label(
                  applying ? "Applying changes…" : "Loading CV family…",
                  applying
                    ? "Değişiklikler uygulanıyor…"
                    : "CV ailesi yükleniyor…",
                )}
              </p>
            )}
            {error && <p role="alert">{error}</p>}
            {message && (
              <p role="status" className={styles.notice}>
                {message}
              </p>
            )}
            {report && (
              <>
                <p>
                  {label("Source", "Kaynak")}:{" "}
                  <strong>{report.source.title}</strong> ·{" "}
                  {label("Revision", "Sürüm")} {report.source.revision}
                </p>
                {report.root.id !== document.metadata.id && (
                  <p>
                    {label("Original CV", "Ana CV")}:{" "}
                    <Link
                      href={`/resumes/${report.root.id}`}
                      onClick={() => setOpen(false)}
                    >
                      {report.root.title}
                    </Link>
                  </p>
                )}
                {tab === "sync" ? (
                  <>
                    <p className={styles.help}>
                      {label(
                        "Active copies and their derived versions are included. Tailored or translated fields are protected by default. Select the exact changes to copy; omitted entries, design and job settings stay unchanged.",
                        "Aktif kopyalar ve bunlardan türetilen sürümler birlikte gösterilir. İlana özel veya çevrilmiş alanlar varsayılan olarak korunur. Aktarılacak değişiklikleri seçin; çıkarılmış kayıtlar, tasarım ve ilan ayarları korunur.",
                      )}
                    </p>
                    {!report.variants.length && (
                      <p>
                        {label(
                          "No active copies of this CV.",
                          "Bu CV’den oluşturulmuş aktif kopya yok.",
                        )}
                      </p>
                    )}
                    {report.variants.map((variant) => (
                      <section
                        key={variant.id}
                        className={styles.card}
                        aria-label={variant.title}
                      >
                        <header>
                          <h3>{variant.title}</h3>
                          <Link
                            href={`/resumes/${variant.id}`}
                            onClick={() => setOpen(false)}
                          >
                            {label("Open CV", "CV’yi aç")}
                          </Link>
                        </header>
                        {!variant.hasBaseline && (
                          <p>
                            {label(
                              "The original source snapshot is unavailable. Automatic propagation is disabled to protect this copy.",
                              "Kopyanın oluşturulduğu kaynak bulunamadı. Bu kopyayı korumak için aktarım kapalı.",
                            )}
                          </p>
                        )}
                        {variant.hasBaseline && !variant.changes.length && (
                          <p>
                            {label(
                              "No source changes to transfer.",
                              "Aktarılacak kaynak değişikliği yok.",
                            )}
                          </p>
                        )}
                        {variant.changes.length > 0 && (
                          <button
                            type="button"
                            disabled={busy || dirty}
                            onClick={() =>
                              setSelected((current) => {
                                const next = new Set(current);
                                variant.changes
                                  .filter(
                                    (change) =>
                                      change.status === "safe" &&
                                      change.action === "field",
                                  )
                                  .forEach((change) =>
                                    next.add(choiceKey(variant.id, change)),
                                  );
                                return next;
                              })
                            }
                          >
                            {label(
                              "Select unchanged fields",
                              "Özel düzenleme içermeyen alanları seç",
                            )}
                          </button>
                        )}
                        {variant.changes.map((change) => (
                          <div key={change.id} className={styles.change}>
                            <label>
                              <input
                                type="checkbox"
                                checked={selected.has(
                                  choiceKey(variant.id, change),
                                )}
                                disabled={
                                  busy ||
                                  dirty ||
                                  (change.status === "customized" && !overwrite)
                                }
                                onChange={(event) =>
                                  setSelected((current) => {
                                    const next = new Set(current);
                                    if (event.target.checked)
                                      next.add(choiceKey(variant.id, change));
                                    else
                                      next.delete(
                                        choiceKey(variant.id, change),
                                      );
                                    return next;
                                  })
                                }
                              />
                              <strong>
                                {name(change.section)}
                                {change.label && ` · ${change.label}`} ·{" "}
                                {change.action === "add"
                                  ? label("New entry", "Yeni kayıt")
                                  : change.action === "remove"
                                    ? label("Remove entry", "Kaydı kaldır")
                                    : name(change.field)}
                              </strong>
                              <span>
                                {change.status === "customized"
                                  ? label("Customized", "Özel düzenleme")
                                  : label(
                                      "Unchanged in copy",
                                      "Kopyada değiştirilmemiş",
                                    )}
                              </span>
                            </label>
                            <div className={styles.comparison}>
                              <div>
                                <h4>{label("Current copy", "Mevcut kopya")}</h4>
                                <p>{valueText(change.before)}</p>
                              </div>
                              <div>
                                <h4>
                                  {label("Source value", "Kaynak değeri")}
                                </h4>
                                <p>{valueText(change.after)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </section>
                    ))}
                    {report.variants.some((v) =>
                      v.changes.some((c) => c.status === "customized"),
                    ) && (
                      <label className={styles.override}>
                        <input
                          type="checkbox"
                          disabled={busy || dirty}
                          checked={overwrite}
                          onChange={(event) => {
                            setOverwrite(event.target.checked);
                            if (!event.target.checked)
                              setSelected((current) => {
                                const next = new Set(current);
                                report.variants.forEach((v) =>
                                  v.changes
                                    .filter((c) => c.status === "customized")
                                    .forEach((c) =>
                                      next.delete(choiceKey(v.id, c)),
                                    ),
                                );
                                return next;
                              });
                          }}
                        />
                        {label(
                          "Allow replacing customized fields that I explicitly select",
                          "Yalnızca seçtiğim özel düzenlemelerin üzerine yazmaya izin ver",
                        )}
                      </label>
                    )}
                  </>
                ) : (
                  <>
                    <p className={styles.help}>
                      {label(
                        "Differences need verification, not automatic correction. Wording can intentionally vary by job; translated titles are excluded when CV languages differ.",
                        "Farklılıklar otomatik hata sayılmaz; doğrulayın. Anlatım ilana göre farklı olabilir; CV dilleri farklıysa çevrilen başlıklar karşılaştırılmaz.",
                      )}
                    </p>
                    <p className={styles.help}>
                      {tr
                        ? `${report.comparedFields} ortak bilgi alanı karşılaştırıldı.`
                        : `${report.comparedFields} shared factual fields compared.`}
                    </p>
                    {!report.comparedFields && (
                      <p>
                        {label(
                          "There are no shared entries to compare in this family.",
                          "Bu ailede karşılaştırılabilir ortak kayıt yok.",
                        )}
                      </p>
                    )}
                    {!report.findings.length && report.comparedFields > 0 && (
                      <p>
                        {label(
                          "No differences found in comparable dates, titles and institutions.",
                          "Karşılaştırılabilir tarihler, unvanlar ve kurumlarda farklılık bulunmadı.",
                        )}
                      </p>
                    )}
                    {report.findings.map((finding, index) => (
                      <section key={index} className={styles.card}>
                        <header>
                          <h3>{finding.title}</h3>
                          <Link
                            href={`/resumes/${finding.documentId}?section=${finding.section}&entry=${encodeURIComponent(finding.entryId)}`}
                            onClick={() => setOpen(false)}
                          >
                            {label("Check entry", "Kaydı kontrol et")}
                          </Link>
                        </header>
                        <p>
                          {name(finding.section)} · {name(finding.field)}
                        </p>
                        <div className={styles.comparison}>
                          <div>
                            <h4>{label("Original CV", "Ana CV")}</h4>
                            <p>{valueText(finding.source)}</p>
                          </div>
                          <div>
                            <h4>{label("Variant", "Varyant")}</h4>
                            <p>{valueText(finding.variant)}</p>
                          </div>
                        </div>
                      </section>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
          <footer className={styles.footer}>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setMessage("");
                setReload((v) => v + 1);
              }}
            >
              {label("Refresh preview", "Önizlemeyi yenile")}
            </button>
            {tab === "sync" && (
              <button
                type="button"
                className="primary"
                disabled={
                  busy ||
                  disabled ||
                  dirty ||
                  !choices.length ||
                  choices.length > 400
                }
                onClick={async () => {
                  if (!report) return;
                  setApplying(true);
                  setError("");
                  setMessage("");
                  try {
                    const applied = await familyApi.apply(
                      document.metadata.id,
                      {
                        sourceRevision: report.source.revision,
                        choices,
                        overwriteCustomized: overwrite,
                      },
                    );
                    setMessage(
                      tr
                        ? `${applied.count} CV güncellendi. Önceki sürümler geçmişte korunur.`
                        : `${applied.count} CVs updated. Previous versions remain in history.`,
                    );
                    setReload((v) => v + 1);
                  } catch {
                    setError(
                      label(
                        "The source or copy may have changed. Refresh the preview and select changes again.",
                        "Kaynak veya kopya değişmiş olabilir. Önizlemeyi yenileyip değişiklikleri tekrar seçin.",
                      ),
                    );
                  } finally {
                    setApplying(false);
                  }
                }}
              >
                {label(
                  "Apply selected changes",
                  "Seçilen değişiklikleri uygula",
                )}{" "}
                ({choices.length})
              </button>
            )}
          </footer>
        </dialog>
      )}
    </>
  );
}
