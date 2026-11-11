export function ChorusMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M30.6 10.2C27 6.7 21.6 5.3 16.6 7 9.3 9.4 5.5 17.3 8.1 24.4c2.8 7.7 12 11.2 18.9 6.8"
        stroke="currentColor"
        strokeWidth="2.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M27.9 14.4c-2.9-2.8-7.5-3.6-11-1.4-4.3 2.6-5.4 8.3-2.3 12.2 3 3.8 8.6 4.4 12.3 1.3"
        stroke="currentColor"
        strokeWidth="2.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity=".78"
      />
      <path
        d="M25.1 18.1c-1.8-1.5-4.5-1.5-6.2.1-1.8 1.7-1.7 4.5.2 6 1.7 1.4 4.3 1.3 5.9-.2"
        stroke="currentColor"
        strokeWidth="2.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity=".56"
      />
      <circle cx="31.2" cy="20.4" r="2.55" fill="#FFB45C" />
    </svg>
  );
}
