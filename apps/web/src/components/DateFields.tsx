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
    <fieldset className="grid grid-cols-2 gap-2 text-sm">
      <label>
        {copy("Start date")}
        <input
          className="w-full p-2 rounded bg-surface-container-lowest"
          value={value.startDate}
          placeholder="YYYY-MM"
          onChange={(e) => onChange({ ...value, startDate: e.target.value })}
        />
      </label>
      <label>
        {copy("End date")}
        <input
          className="w-full p-2 rounded bg-surface-container-lowest"
          value={value.endDate}
          placeholder="YYYY-MM"
          disabled={value.current}
          onChange={(e) => onChange({ ...value, endDate: e.target.value })}
        />
      </label>
      {allowPresent && (
        <label className="col-span-2 flex gap-2">
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
