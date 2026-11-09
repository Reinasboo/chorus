export function ChorusMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M29.2 11.1a13.2 13.2 0 1 0 0 17.8M12.2 20h15.6M18 12.8 25.2 20 18 27.2"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="11.5" cy="20" r="2.5" fill="#EF233C" />
    </svg>
  );
}
