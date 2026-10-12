"use client";

import { useI18n } from "@/lib/i18n";
import styles from "./ReadingHeatmap.module.css";

export type ReadingRegion = {
  label: string;
  top: number;
  left: number;
  width: number;
  height: number;
  firstScreen: boolean;
  dense: boolean;
};

/** Measures the current rendered layout, never the stored CV or export HTML. */
export function measureReadingRegions(
  content: Document,
  firstScreenHeight: number,
): ReadingRegion[] {
  const page = content.querySelector<HTMLElement>(".cv-page");
  if (!page) return [];
  const elements = Array.from(
    page.querySelectorAll<HTMLElement>(":scope > header, :scope > section"),
  );
  const measured = elements
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const density =
        (element.textContent?.trim().length || 0) /
        Math.max(1, rect.width * rect.height);
      return { element, rect, density };
    })
    .filter(({ rect }) => rect.width > 0 && rect.height > 0);
  const densities = measured
    .map(({ density }) => density)
    .sort((a, b) => a - b);
  const median = densities[Math.floor(densities.length / 2)] || 0;
  return measured.map(({ element, rect, density }) => ({
    label:
      element.querySelector("h2, h1")?.textContent?.trim() ||
      element.dataset.studioSection ||
      "-",
    top: rect.top + (content.defaultView?.scrollY || 0),
    left: rect.left,
    width: rect.width,
    height: rect.height,
    firstScreen: rect.top < firstScreenHeight,
    // Relative character density is a visual clutter cue, not a reading score.
    dense: density > median * 1.15,
  }));
}

export function ReadingHeatmapLegend({
  regions,
}: {
  regions: ReadingRegion[];
}) {
  const { language } = useI18n();
  const tr = language === "tr";
  return (
    <aside
      className={`${styles.legend} no-print`}
      aria-label={tr ? "Okuma haritası açıklaması" : "Reading map legend"}
      data-testid="reading-map-legend"
    >
      <strong>
        {tr
          ? "İşe alım okuma haritası · TAHMİN"
          : "Recruiter reading map · ESTIMATE"}
      </strong>
      <p>
        {tr
          ? "Yerel yerleşim sezgiseli: İlk önizleme ekranındaki bölümler daha erken fark edilebilir; tarama, diğer bölümlere göre karakter yoğunluğunu gösterir. Gerçek göz takibi, işe alım olasılığı veya ATS puanı değildir; kişiyi değerlendirmez."
          : "Local layout heuristic: sections in the first preview screen may attract earlier attention; hatching shows character density relative to other sections. This is not real eye tracking, recruiter probability, or an ATS score; it does not rate the person."}
      </p>
      <p>
        {tr
          ? "Konum, boyut ve karakter yoğunluğu ekranda oluşturulan CV'den ölçülür. Sayfanın üstünden başlayan bir tarama varsayılır; renkler göreli görsel dikkat ipuçlarıdır, ölçülmüş okuma davranışı değildir. CV'ye, PDF'ye veya DOCX'e eklenmez."
          : "Position, size and character density are measured from the rendered CV. Assumes a scan starting at the top; colors are relative visual attention cues, not measured reading behavior. Never added to the CV, PDF or DOCX."}
      </p>
      <ul className={styles.keys}>
        <li>
          <span className={styles.earlyKey} aria-hidden="true" />
          {tr
            ? "İlk ekran · daha erken fark edilebilir"
            : "First screen · may be noticed earlier"}
        </li>
        <li>
          <span className={styles.laterKey} aria-hidden="true" />
          {tr ? "İlk ekranın altında" : "Below the first screen"}
        </li>
        <li>
          <span className={styles.denseKey} aria-hidden="true" />
          {tr ? "Görece yoğun metin" : "Relatively dense text"}
        </li>
      </ul>
      <ul className={styles.sections}>
        {regions.map((region, index) => (
          <li key={index}>
            {region.label}:{" "}
            {region.firstScreen
              ? tr
                ? "ilk ekran"
                : "first screen"
              : tr
                ? "daha aşağıda"
                : "further down"}
            {region.dense ? (tr ? "; görece yoğun" : "; relatively dense") : ""}
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function ReadingHeatmapOverlay({
  regions,
  scale,
}: {
  regions: ReadingRegion[];
  scale: number;
}) {
  return (
    <div
      className={`${styles.overlay} no-print`}
      aria-hidden="true"
      data-testid="reading-map-overlay"
    >
      {regions.map((region, index) => (
        <div
          key={index}
          data-testid="reading-map-region"
          data-first-screen={region.firstScreen}
          className={`${styles.region} ${region.firstScreen ? styles.early : styles.later} ${region.dense ? styles.dense : ""}`}
          style={{
            top: region.top * scale,
            left: region.left * scale,
            width: region.width * scale,
            height: region.height * scale,
          }}
        />
      ))}
    </div>
  );
}
