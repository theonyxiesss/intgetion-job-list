/**
 * Brand marks for the sign-in row (D335). They are filled SVGs, not Lucide
 * strokes, so the button still reads as that service at 20 px.
 */
export function SocialMark({ name }: { name: "google" | "telegram" | "x" }) {
  if (name === "google") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="#4285F4"
          d="M23.52 12.27c0-.82-.07-1.64-.22-2.43H12v4.6h6.46a5.53 5.53 0 0 1-2.4 3.63v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.81z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3.01c-1.08.73-2.46 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.95H1.26v3.11A12 12 0 0 0 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.6H1.26a12 12 0 0 0 0 10.8l4.01-3.11z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.45-3.45A12 12 0 0 0 1.26 6.6l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75z"
        />
      </svg>
    );
  }
  if (name === "telegram") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="#2AABEE"
          d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.89 8.19-1.97 9.28c-.15.66-.54.82-1.1.51l-3.04-2.24-1.47 1.41c-.16.16-.3.3-.61.3l.22-3.05 5.56-5.02c.24-.22-.05-.34-.38-.13l-6.87 4.33-2.96-.92c-.64-.2-.66-.64.14-.95l11.57-4.46c.54-.2 1.01.13.81.94z"
        />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M14.23 10.16 22.06 1.5h-1.86l-6.8 7.52L8.16 1.5H1.5l8.21 11.36L1.5 22.5h1.86l7.18-7.94 5.74 7.94h6.66l-8.71-12.34zm-2.54 2.8-.83-1.19-6.62-9.47h2.85l5.34 7.64.83 1.19 6.94 9.93h-2.85l-5.66-8.1z"
      />
    </svg>
  );
}
