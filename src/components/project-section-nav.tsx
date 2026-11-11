import Link from "next/link";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "treasury", label: "Treasury" },
  { id: "contributions", label: "Contributions" },
  { id: "tasks", label: "Tasks" },
  { id: "approvals", label: "Approvals" },
  { id: "intelligence", label: "Intelligence" },
  { id: "activity", label: "Activity" },
  { id: "members", label: "Members" },
];

export function ProjectSectionNav() {
  return (
    <nav className="project-section-nav" aria-label="Project sections">
      {sections.map((section) => (
        <Link
          href={`#${section.id}`}
          key={section.id}
          aria-current={section.id === "overview" ? "location" : undefined}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}
