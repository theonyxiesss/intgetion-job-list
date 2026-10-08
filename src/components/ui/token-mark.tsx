/**
 * USDC and Tether marks. Brand colours stay in the UI kit (DESIGN.md: no raw
 * hex in pages). The shapes are simple geometric marks, not copied artwork.
 */
export function TokenMark({ token }: { token: "USDC" | "USDT" }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className="size-9 shrink-0"
      aria-hidden="true"
    >
      {token === "USDC" ? (
        <>
          <circle cx="16" cy="16" r="16" fill="#2775CA" />
          <path
            fill="#fff"
            d="M17.1 8h-1.6v1.8c-1.9.2-3.2 1.2-3.2 2.7 0 1.4 1 2.2 2.8 2.5l.4.1v2.7c-.9-.2-1.5-.6-1.9-1.2l-1.4 1.1c.7 1 1.9 1.6 3.3 1.8V21h1.6v-1.5c2-.2 3.4-1.3 3.4-2.9 0-1.5-1.1-2.4-3-2.7l-.4-.1v-2.8c.9.2 1.6.7 2 1.3l1.4-1.1c-.7-1-1.9-1.6-3.4-1.8V8zm-1.6 3.3v2.5c-1-.2-1.5-.6-1.5-1.2s.5-1.1 1.5-1.3zm1.6 5.6v-2.6c1.1.2 1.7.7 1.7 1.3s-.6 1.1-1.7 1.3z"
          />
        </>
      ) : (
        <>
          <circle cx="16" cy="16" r="16" fill="#26A17B" />
          <path
            fill="#fff"
            d="M17.7 17.5v-.6c2.2-.1 3.8-.6 4.1-1.1-.3-.5-1.9-1-4.1-1.1V12.4h3.8v-2.2H10.4v2.2h3.8v2.3c-2.2.1-3.8.6-4.1 1.1.3.5 1.9 1 4.1 1.1v.6c-2.5.1-4.4.7-4.4 1.4 0 .7 1.9 1.2 4.4 1.4v3.9h3.5v-3.9c2.5-.2 4.4-.7 4.4-1.4 0-.7-1.9-1.3-4.4-1.4z"
          />
        </>
      )}
    </svg>
  );
}
