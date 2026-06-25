/** HTML formatting helpers, equivalent to aiogram.utils.markdown. */

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function hbold(text: string | number): string {
  return `<b>${escapeHtml(String(text))}</b>`;
}

export function hcode(text: string | number): string {
  return `<code>${escapeHtml(String(text))}</code>`;
}

export function hlink(text: string, url: string): string {
  return `<a href="${escapeHtml(url)}">${escapeHtml(text)}</a>`;
}

/** Replaces {key} placeholders in a template with values from data. */
export function format(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in data ? String(data[key]) : match,
  );
}
