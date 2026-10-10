import type { Shape } from './shapes';

export type Tone = 'primary' | 'secondary' | 'accent' | 'highlight';
export type KeyLine = { text: string; size: number; bold?: boolean; tone: Tone };
export type KeyVariant = 'world' | 'f1';

const SIZE = 120;
const MAX_TEXT_WIDTH = 114;
const LINE_GAP = 2;
const FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif';

const THEMES = {
  world: { background: '#0B1220', outline: '#7DD3FC', fill: '#38BDF8', accent: '#7DD3FC' },
  f1: { background: '#101014', outline: '#E10600', fill: '#E10600', accent: '#F87171' },
} as const;

const TONES = { primary: '#FFFFFF', secondary: '#CBD5E1', highlight: '#FBBF24' } as const;

/** Builds the key face: background outline (country + city dot, or circuit) with the given lines centred on top. */
export function keySvg(lines: readonly KeyLine[], shape: Shape | undefined, variant: KeyVariant): string {
  const theme = THEMES[variant];
  const parts = [`<rect width="${SIZE}" height="${SIZE}" fill="${theme.background}"/>`];

  if (shape) {
    const style = shape.kind === 'area'
      ? `fill="${theme.fill}" fill-opacity="0.22" stroke="${theme.outline}" stroke-opacity="0.65" stroke-width="1.4"`
      : `fill="none" stroke="${theme.outline}" stroke-opacity="0.9" stroke-width="3.2" stroke-linecap="round"`;
    const dot = shape.dot ? `<circle cx="${shape.dot[0]}" cy="${shape.dot[1]}" r="4" fill="#F59E0B"/>` : '';
    parts.push(`<g transform="translate(5 5) scale(1.1)"><path d="${shape.path}" ${style} stroke-linejoin="round"/>${dot}</g>`);
  }

  const fitted = lines.map((line) => ({
    ...line,
    size: Math.min(line.size, (line.size * MAX_TEXT_WIDTH) / textWidth(line.text, line.size, line.bold)),
  }));
  const height = fitted.reduce((sum, line) => sum + line.size * 1.12, 0) + LINE_GAP * (fitted.length - 1);
  let top = (SIZE - height) / 2;
  for (const line of fitted) {
    const attrs = `x="${SIZE / 2}" y="${(top + line.size * 0.9).toFixed(1)}" text-anchor="middle" font-family="${FONT}" font-size="${line.size.toFixed(1)}"${line.bold ? ' font-weight="700"' : ''}`;
    const text = escapeXml(line.text);
    const color = line.tone === 'accent' ? theme.accent : TONES[line.tone];
    // The background-coloured stroke underneath acts as a halo so text stays readable over the outline.
    parts.push(
      `<text ${attrs} fill="none" stroke="${theme.background}" stroke-width="3" stroke-linejoin="round">${text}</text>`,
      `<text ${attrs} fill="${color}">${text}</text>`,
    );
    top += line.size * 1.12 + LINE_GAP;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${parts.join('')}</svg>`;
}

/** Rough Helvetica advance widths; errs wide so text is shrunk rather than clipped. */
function textWidth(text: string, size: number, bold = false): number {
  let em = 0;
  for (const char of text) {
    if (/[\s:.,'’·-]/.test(char)) em += 0.3;
    else if (/[ijlftI]/.test(char)) em += 0.3;
    else if (/[mwMW]/.test(char)) em += 0.86;
    else if (/[A-Z]/.test(char)) em += 0.7;
    else em += 0.58;
  }
  return em * size * (bold ? 1.06 : 1);
}

function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}
