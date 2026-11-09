import Link from "next/link";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "treasury", label: "Treasury" },
  { id: "tasks", label: "Tasks" },
  { id: "intelligence", label: "Intelligence" },
  { id: "activity", label: "Activity" },
  { id: "members", label: "Members" },
];

export function ProjectSectionNav({ projectId }: { projectId: string }) {
  return (
    <nav className="project-section-nav" aria-label="Project sections">
      {sections.map((section) => (
        <Link
          href={`/projects/${projectId}#${section.id}`}
          key={section.id}
          aria-current={section.id === "overview" ? "location" : undefined}
        >
          {section.label}
          {section.id === "tasks" && <span>Not enabled</span>}
        </Link>
      ))}
    </nav>
  );
}
