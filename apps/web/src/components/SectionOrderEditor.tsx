"use client";
import { useCopy } from "@/lib/copy";
import { ResumeDocument } from "@/lib/types";
import { sectionOrder, moveItem } from "@/lib/section-order";
import { ReorderControls } from "./ReorderControls";
export function SectionOrderEditor({
  document,
  onChange,
}: {
  document: ResumeDocument;
  onChange: (doc: ResumeDocument) => void;
}) {
  const copy = useCopy();
  const order = sectionOrder(document);
  const labels: Record<string, string> = {
    summary: "Professional Summary",
    experience: "Work Experience",
    education: "Education",
    projects: "Projects",
    skills: "Skill Groups",
    certifications: "Certifications",
    languages: "Languages",
    customSections: "Custom sections",
  };
  return (
    <section className="workflow-tool">
      <h3>{copy("Section order")}</h3>
      <p>
        {copy("Drag a handle onto another handle, or use the arrow buttons.")}
      </p>
      <ol>
        {order.map((key, index) => (
          <li key={key}>
            <span>{copy(labels[key])}</span>
            <ReorderControls
              group="sections"
              index={index}
              count={order.length}
              label={copy(labels[key])}
              onMove={(from, to) =>
                onChange({
                  ...document,
                  design: {
                    ...document.design,
                    sectionOrder: moveItem(order, from, to),
                  },
                })
              }
            />
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() =>
          onChange({
            ...document,
            design: { ...document.design, sectionOrder: [] },
          })
        }
      >
        {copy("Restore template order")}
      </button>
    </section>
  );
}
