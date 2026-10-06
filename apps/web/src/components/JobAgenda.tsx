"use client";
import { JobApplication } from "@/lib/types";
import { useCopy } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
export function JobAgenda({
  jobs,
  onSelect,
}: {
  jobs: JobApplication[];
  onSelect: (job: JobApplication) => void;
}) {
  const copy = useCopy();
  const { language } = useI18n();
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const events = jobs
    .filter((job) => !["archived", "rejected"].includes(job.status))
    .flatMap((job) => [
      ...(job.interviewAt
        ? [
            {
              job,
              label: "Interview",
              date: job.interviewAt,
              time: new Date(job.interviewAt).getTime(),
            },
          ]
        : []),
      ...(job.followUpDate
        ? [
            {
              job,
              label: "Follow-up",
              date: job.followUpDate,
              time: new Date(`${job.followUpDate}T00:00`).getTime(),
            },
          ]
        : []),
    ])
    .filter((event) => event.time <= today + 14 * 86400000)
    .sort((a, b) => a.time - b.time);
  return (
    <section className="workflow-tool job-agenda">
      <h2>{copy("Upcoming and overdue tasks")}</h2>
      <p>
        {copy(
          "Scheduled tasks through the next 14 days; overdue dates stay visible until updated.",
        )}
      </p>
      {!events.length && <p>{copy("No scheduled tasks in this period.")}</p>}
      <ul>
        {events.map((event) => (
          <li key={`${event.job.id}-${event.label}`}>
            <button type="button" onClick={() => onSelect(event.job)}>
              <strong>
                {event.job.company} · {event.job.position}
              </strong>
              <span>
                {copy(event.label)} ·{" "}
                {new Date(
                  event.label === "Follow-up"
                    ? `${event.date}T00:00`
                    : event.date,
                ).toLocaleString(
                  language === "tr" ? "tr-TR" : "en-GB",
                  event.label === "Follow-up"
                    ? { dateStyle: "medium" }
                    : { dateStyle: "medium", timeStyle: "short" },
                )}
                {event.time < today ? ` · ${copy("Overdue")}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
