"use client";
import { useCopy } from "@/lib/copy";
export function ReorderControls({
  index,
  count,
  label,
  group,
  onMove,
}: {
  index: number;
  count: number;
  label: string;
  group: string;
  onMove: (from: number, to: number) => void;
}) {
  const copy = useCopy();
  return (
    <div
      className="reorder-controls"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/x-cv-order"))
          e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        try {
          const source = JSON.parse(
            e.dataTransfer.getData("application/x-cv-order"),
          );
          if (source.group === group && Number.isInteger(source.index))
            onMove(source.index, index);
        } catch {
          /* Unrelated drag data is ignored. */
        }
      }}
    >
      <button
        type="button"
        draggable
        aria-label={`${copy("Drag to reorder")}: ${label}`}
        title={copy(
          "Drag a handle onto another handle, or use the arrow buttons.",
        )}
        onDragStart={(e) => {
          e.dataTransfer.setData(
            "application/x-cv-order",
            JSON.stringify({ index, group }),
          );
          e.dataTransfer.effectAllowed = "move";
        }}
        className="reorder-handle"
      >
        ⠿
      </button>
      <button
        type="button"
        disabled={index === 0}
        aria-label={`${copy("Move up")}: ${label}`}
        onClick={() => onMove(index, index - 1)}
      >
        ↑
      </button>
      <button
        type="button"
        disabled={index === count - 1}
        aria-label={`${copy("Move down")}: ${label}`}
        onClick={() => onMove(index, index + 1)}
      >
        ↓
      </button>
    </div>
  );
}
