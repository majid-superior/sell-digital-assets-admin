export type ClassValue =
  | string
  | number
  | bigint
  | boolean
  | undefined
  | null
  | Record<string, boolean | number | string | null | undefined>
  | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  function process(input: ClassValue): void {
    if (!input) return;
    if (typeof input === "string" || typeof input === "number") {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      for (const item of input) {
        process(item);
      }
    } else if (typeof input === "object") {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }

  for (const input of inputs) {
    process(input);
  }

  return classes.join(" ");
}
