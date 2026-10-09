"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
export type Theme = "light" | "dark" | "system";
const key = "cv_workspace_theme";
function readTheme(): Theme {
  try {
    const value = localStorage.getItem(key);
    if (value === "light" || value === "dark") return value;
  } catch {
    /* Private storage may be unavailable. */
  }
  return "system";
}
function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle(
    "dark",
    theme === "dark" ||
      (theme === "system" &&
        matchMedia("(prefers-color-scheme: dark)").matches),
  );
}
const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({ theme: "system", setTheme: () => {} });
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const current = useRef<Theme>("system");
  useEffect(() => {
    current.current = readTheme();
    setThemeState(current.current);
    applyTheme(current.current);
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (current.current === "system") applyTheme(current.current);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) {
        current.current = readTheme();
        setThemeState(current.current);
        applyTheme(current.current);
      }
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  function setTheme(value: Theme) {
    current.current = value;
    setThemeState(value);
    applyTheme(value);
    try {
      localStorage.setItem(key, value);
    } catch {
      /* The current session still changes. */
    }
  }
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function ThemePicker() {
  const { theme, setTheme } = useContext(ThemeContext);
  const { language } = useI18n();
  const labels =
    language === "tr"
      ? { light: "Açık", dark: "Koyu", system: "Sistem" }
      : { light: "Light", dark: "Dark", system: "System" };
  return (
    <fieldset className="settings-theme-picker">
      <legend className="font-semibold">
        {language === "tr" ? "Renk teması" : "Color theme"}
      </legend>
      <div className="settings-theme-options">
        {(["light", "dark", "system"] as const).map((value) => (
          <label
            key={value}
            className="settings-theme-option"
            data-selected={theme === value}
          >
            <span
              className={`settings-theme-swatch ${value}`}
              aria-hidden="true"
            >
              <span />
              <span />
              <span />
            </span>
            <span className="settings-theme-choice">
              <input
                aria-label={labels[value]}
                type="radio"
                name="color-theme"
                value={value}
                checked={theme === value}
                onChange={() => setTheme(value)}
              />
              <span>{labels[value]}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="text-body-sm text-secondary">
        {language === "tr"
          ? "Sistem, cihazınızın görünümünü izler. Tercihiniz bu tarayıcıda kaydedilir. Özgeçmişler ve PDF'ler beyaz kalır."
          : "System follows your device’s appearance. Your choice is saved in this browser. Resume pages and PDFs stay white."}
      </p>
    </fieldset>
  );
}
