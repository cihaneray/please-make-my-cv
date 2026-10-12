"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AIEdit } from "@/lib/api";
import type { ResumeDocument } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import {
  missingFactsApi,
  type MissingFactsResult,
} from "@/lib/ai-missing-facts";
import { AISuggestion } from "./AISuggestion";
import styles from "./AIMissingFacts.module.css";

export interface AIMissingFactsProps {
  document: ResumeDocument;
  questions: string[];
  jobDescription?: string;
  language: "en" | "tr";
  contextKey?: string;
  disabled?: boolean;
  onApply: (edit: AIEdit) => void;
  onNavigate?: (edit: AIEdit) => void;
}

export function AIMissingFacts({
  document,
  questions,
  jobDescription = "",
  language,
  contextKey = "",
  disabled = false,
  onApply,
  onNavigate,
}: AIMissingFactsProps) {
  const { language: uiLanguage } = useI18n();
  const label = (en: string, tr: string) => (uiLanguage === "tr" ? tr : en);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<MissingFactsResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [generatedContext, setGeneratedContext] = useState("");
  const [generation, setGeneration] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const context = JSON.stringify({
    questions,
    answers,
    jobDescription,
    language,
    contextKey,
  });
  const input = JSON.stringify({ document, context });
  const latestInput = useRef(input);
  useEffect(() => () => controller.current?.abort(), []);
  useLayoutEffect(() => {
    latestInput.current = input;
    controller.current?.abort();
    setBusy(false);
    // An in-flight response must match the draft and answers it was based on.
  }, [input]);

  if (!questions.length) return null;
  const suppliedAnswers = questions.flatMap((question, index) => {
    const answer = (answers[index] || "").trim();
    return answer ? [{ question, answer }] : [];
  });

  return (
    <section
      className={styles.panel}
      aria-label={label("Missing resume details", "Eksik CV ayrıntıları")}
    >
      <h3>
        {label(
          "Details to add or verify",
          "Eklenecek veya doğrulanacak ayrıntılar",
        )}
      </h3>
      <p className={styles.hint}>
        {label(
          "Answer what you know. Your answers are user supplied, not verified. Generate proposed changes, then review and apply each one yourself.",
          "Bildiğiniz ayrıntıları yanıtlayın. Yanıtlarınız sizin beyanınızdır, doğrulanmış değildir. Önerilen değişiklikleri oluşturun, ardından her birini inceleyip uygulayın.",
        )}
      </p>
      {questions.map((question, index) => (
        <label className={styles.field} key={`${index}-${question}`}>
          <span>{question}</span>
          <textarea
            maxLength={4000}
            rows={3}
            disabled={disabled || busy}
            value={answers[index] || ""}
            placeholder={label(
              "Optional answer; leave unknown details blank",
              "İsteğe bağlı yanıt; bilmediğiniz ayrıntıları boş bırakın",
            )}
            onChange={(event) =>
              setAnswers({ ...answers, [index]: event.target.value })
            }
          />
        </label>
      ))}
      <p className={styles.hint}>
        {label(
          "Generating sends the current draft and nonempty answers to your configured AI provider. Free text may contain personal information.",
          "Oluşturma işlemi mevcut taslağı ve boş olmayan yanıtları yapılandırdığınız yapay zeka sağlayıcısına gönderir. Serbest metin kişisel bilgi içerebilir.",
        )}
      </p>
      <div className={styles.actions}>
        <button
          className="ai-review-primary"
          disabled={disabled || busy || !suppliedAnswers.length}
          onClick={async () => {
            controller.current?.abort();
            const pending = new AbortController();
            controller.current = pending;
            const requestedInput = input;
            setBusy(true);
            setError("");
            try {
              const value = await missingFactsApi.generate(
                {
                  document,
                  answers: suppliedAnswers,
                  jobDescription,
                  language,
                },
                pending.signal,
              );
              if (
                !pending.signal.aborted &&
                latestInput.current === requestedInput
              ) {
                setResult(value);
                setGeneratedContext(context);
                setGeneration((value) => value + 1);
              }
            } catch (cause) {
              if (!pending.signal.aborted)
                setError(
                  cause instanceof Error
                    ? cause.message
                    : label(
                        "Generation failed. Try again.",
                        "Oluşturma başarısız. Tekrar deneyin.",
                      ),
                );
            } finally {
              if (controller.current === pending) setBusy(false);
            }
          }}
        >
          {busy
            ? label("Generating changes…", "Değişiklikler oluşturuluyor…")
            : label(
                "Generate proposed changes using my answers",
                "Yanıtlarımla önerilen değişiklikleri oluştur",
              )}
        </button>
        {busy && (
          <button
            onClick={() => {
              controller.current?.abort();
              setBusy(false);
            }}
          >
            {label("Cancel", "İptal")}
          </button>
        )}
      </div>
      {error && (
        <p className="ai-review-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className={styles.results}>
          <h4>
            {label(
              "Proposed changes from your answers",
              "Yanıtlarınıza dayanan değişiklik önerileri",
            )}
          </h4>
          <p className={styles.hint}>
            {label(
              "These proposals use user-supplied information. Verify every claim before applying.",
              "Bu öneriler beyan ettiğiniz bilgileri kullanır. Uygulamadan önce her iddiayı doğrulayın.",
            )}
          </p>
          {generatedContext !== context && (
            <p role="status">
              {label(
                "Answers or review options changed. Generate new proposals before applying.",
                "Yanıtlar veya inceleme seçenekleri değişti. Uygulamadan önce yeni öneriler oluşturun.",
              )}
            </p>
          )}
          {!result.recommendations.length && (
            <p>
              {label(
                "No safe changes were proposed. Add more specific answers and try again.",
                "Güvenli bir değişiklik önerilmedi. Daha belirgin yanıtlar ekleyip tekrar deneyin.",
              )}
            </p>
          )}
          {result.recommendations.map((item, index) => (
            <AISuggestion
              key={`${generation}-${index}`}
              item={item}
              document={document}
              onApply={onApply}
              onNavigate={onNavigate}
              disabled={disabled || busy || generatedContext !== context}
            />
          ))}
        </div>
      )}
    </section>
  );
}
