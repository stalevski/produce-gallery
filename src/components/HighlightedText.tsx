import type { ReactNode } from "react";

interface HighlightedTextProps {
  text: string;
  query?: string;
}

export function HighlightedText({ text, query }: HighlightedTextProps) {
  const q = query?.trim() ?? "";
  if (!q) return <>{text}</>;

  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let match = lower.indexOf(needle, cursor);
  let key = 0;

  while (match !== -1) {
    if (match > cursor) {
      parts.push(text.slice(cursor, match));
    }
    parts.push(
      <mark
        key={`m-${key++}`}
        className="rounded-sm bg-amber-200/70 px-0.5 text-[#1B1F1A] dark:bg-amber-400/30 dark:text-amber-50"
      >
        {text.slice(match, match + needle.length)}
      </mark>
    );
    cursor = match + needle.length;
    match = lower.indexOf(needle, cursor);
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return <>{parts}</>;
}
