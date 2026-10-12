"use client";
import { useCopy } from "@/lib/copy";

export function DateFields({
  value,
  onChange,
  allowPresent = true,
}: {
  value: { startDate: string; endDate: string; current: boolean };
  allowPresent?: boolean;
  onChange: (next: {
    startDate: string;
    endDate: string;
    current: boolean;
  }) => void;
}) {
  const copy = useCopy();
  return (
    <fieldset className="editor-date-fields">
      <label className="editor-field">
        <span className="editor-field-label">{copy("Start date")}</span>
        <input
          className="editor-date-input"
          value={value.startDate}
          placeholder={copy("YYYY-MM")}
          onChange={(e) => onChange({ ...value, startDate: e.target.value })}
        />
      </label>
      <label className="editor-field">
        <span className="editor-field-label">{copy("End date")}</span>
        <input
          className="editor-date-input"
          value={value.endDate}
          placeholder={copy("YYYY-MM")}
          disabled={value.current}
          onChange={(e) => onChange({ ...value, endDate: e.target.value })}
        />
      </label>
      {allowPresent && (
        <label className="editor-date-present">
          <input
            type="checkbox"
            checked={value.current}
            onChange={(e) => onChange({ ...value, current: e.target.checked })}
          />
          {copy("Present")}
        </label>
      )}
    </fieldset>
  );
}
