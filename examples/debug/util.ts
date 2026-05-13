export const assertNotNull = <T>(value: T | null | undefined): T => {
  if (value == null) throw new Error();
  return value;
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * Create an HTML element with minimum fuss.
 *
 * @param name The tag name of the HTML element.
 * @param attrs The attributes to be set on the HTML element.
 * @param children The children to be added to the element.
 * @returns The new HTML element.
 */
export const html = <Name extends keyof HTMLElementTagNameMap>(
  name: Name,
  attrs: Record<string, string | number> = {},
  children: (string | Node)[] = [],
): HTMLElementTagNameMap[Name] => {
  const element = document.createElement(name);
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, String(value));
  }
  element.replaceChildren(...children);
  return element;
};
