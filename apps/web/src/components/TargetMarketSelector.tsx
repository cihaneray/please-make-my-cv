"use client";
import { SelectMenu } from "./SelectMenu";
const MARKETS = ["TR", "US", "UK", "EU", "GLOBAL", "OTHER"] as const;
export type TargetMarketCode = (typeof MARKETS)[number];
export function TargetMarketSelector({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Record<TargetMarketCode, string>;
  onChange: (value: TargetMarketCode) => void;
}) {
  return (
    <SelectMenu
      aria-label={label}
      value={value}
      onValueChange={(value) => onChange(value as TargetMarketCode)}
    >
      {MARKETS.map((code) => (
        <option key={code} value={code}>
          {options[code]}
        </option>
      ))}
    </SelectMenu>
  );
}
