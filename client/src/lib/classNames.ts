// client/src/lib/classNames.ts
// Small utility for conditional Tailwind classes

export function classNames(
    ...classes: Array<string | false | null | undefined>
  ): string {
    return classes.filter(Boolean).join(" ");
  }
  