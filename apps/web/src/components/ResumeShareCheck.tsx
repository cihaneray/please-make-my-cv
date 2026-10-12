"use client";

import { useId, useMemo, useRef } from "react";
import type { ResumeDocument } from "@/lib/types";
import { checkResumeSharing } from "@/lib/resume-share-check";
import { Icons } from "./Icons";
import styles from "./ResumeShareCheck.module.css";

export function ResumeShareCheck({
  document,
  language,
  disabled = false,
}: {
  document: ResumeDocument;
  language: "en" | "tr";
  disabled?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const tr = language === "tr";
  const copy = (en: string, turkish: string) => (tr ? turkish : en);
  const findings = useMemo(
    () => checkResumeSharing(document, language),
    [document, language],
  );
  const warnings = findings.filter((finding) => finding.level === "warning");
  const privacy = findings.filter((finding) => finding.level === "info");
  const close = () => dialog.current?.close();
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="editorial-button"
        disabled={disabled}
        onClick={() => dialog.current?.showModal()}
        data-testid="resume-share-check-trigger"
      >
        <Icons.Shield size={16} />
        {copy("Sharing check", "Paylaşım kontrolü")}
      </button>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClose={() => trigger.current?.focus()}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const buttons = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
          ).filter((button) => button.getClientRects().length > 0);
          const first = buttons[0];
          const last = buttons[buttons.length - 1];
          if (event.shiftKey && event.target === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && event.target === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < rect.left ||
              event.clientX > rect.right ||
              event.clientY < rect.top ||
              event.clientY > rect.bottom
            )
              close();
          }
        }}
        data-testid="resume-share-check-dialog"
      >
        <div className={styles.header}>
          <div>
            <h2 id={titleId}>{copy("Before you share", "Paylaşmadan önce")}</h2>
            <p id={descriptionId}>
              {copy(
                "Checks the current draft locally. No content is sent to AI or link destinations.",
                "Mevcut taslak yerel olarak kontrol edilir. İçerik yapay zekâya veya bağlantı adreslerine gönderilmez.",
              )}
            </p>
          </div>
          <button
            type="button"
            className="editorial-button"
            aria-label={copy(
              "Close sharing check",
              "Paylaşım kontrolünü kapat",
            )}
            onClick={close}
            autoFocus
          >
            <Icons.Close size={18} />
          </button>
        </div>
        <div className={styles.body}>
          <p className={styles.notice}>
            {copy(
              "This is a limited advisory, not a safety certificate or ATS score. It does not check whether links are reachable or claims are accurate. Downloads remain available; nothing is changed automatically.",
              "Bu sınırlı bir hatırlatmadır; güvenlik sertifikası veya ATS puanı değildir. Bağlantıların erişilebilirliğini veya iddiaların doğruluğunu kontrol etmez. İndirme kullanılabilir; hiçbir bilgi otomatik değiştirilmez.",
            )}
          </p>
          <section aria-labelledby={`${titleId}-warnings`}>
            <h3 id={`${titleId}-warnings`}>
              {copy("Review before sharing", "Paylaşmadan önce gözden geçirin")}{" "}
              <span>{warnings.length}</span>
            </h3>
            {warnings.length === 0 ? (
              <p className={styles.empty}>
                {copy(
                  "No suspicious links or recognised draft placeholders found in visible sections.",
                  "Görünür bölümlerde şüpheli bağlantı veya tanınan taslak metni bulunmadı.",
                )}
              </p>
            ) : (
              <ul className={styles.list}>
                {warnings.map((finding) => (
                  <li key={finding.id} data-testid="resume-share-warning">
                    <strong>{finding.location}</strong>
                    <p>{finding.detail}</p>
                    <small>{finding.action}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby={`${titleId}-privacy`}>
            <h3 id={`${titleId}-privacy`}>
              {copy("Personal information", "Kişisel bilgiler")}{" "}
              <span>{privacy.length}</span>
            </h3>
            <p className={styles.hint}>
              {copy(
                "Contact details and a photo can be appropriate. Decide what to share with this recipient.",
                "İletişim bilgileri ve fotoğraf gerekli olabilir. Bu alıcıyla hangi bilgileri paylaşacağınıza karar verin.",
              )}
            </p>
            {privacy.length === 0 ? (
              <p className={styles.empty}>
                {copy(
                  "No contact details or visible photo found. Your name and career content may still identify you.",
                  "İletişim bilgisi veya görünür fotoğraf bulunmadı. Adınız ve kariyer içeriğiniz yine de kimliğinizi belirtebilir.",
                )}
              </p>
            ) : (
              <ul className={styles.list}>
                {privacy.map((finding) => (
                  <li key={finding.id} data-testid="resume-share-privacy">
                    <strong>{finding.detail}</strong>
                    <small>{finding.action}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <footer className={styles.footer}>
          <p>
            {copy(
              "Close this panel to edit details or choose a download format.",
              "Bilgileri düzenlemek veya indirme biçimini seçmek için paneli kapatın.",
            )}
          </p>
          <button type="button" className="editorial-button" onClick={close}>
            {copy("Back to editor", "Düzenlemeye dön")}
          </button>
        </footer>
      </dialog>
    </>
  );
}
