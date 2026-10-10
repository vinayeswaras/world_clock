import { CommandAction } from '@logitech/plugin-sdk';
import { spawn } from 'node:child_process';
import { formatOffset, shifted, zoneTime } from '../clock-format';
import { keySvg, type KeyLine } from '../key-image';
import type { Settings } from '../settings';
import { SHAPES } from '../shapes';
import type { ClockZone } from '../zones';

export type ClockView = { offsetMinutes: number; settings: Settings };

/** One key = one location. The key face is an SVG image served by WorldClock; `face` holds the latest one. */
export class ClockKeyAction extends CommandAction {
  readonly name: string;
  displayName: string;
  description: string;
  declare readonly groupName: string;
  face: string | undefined;

  private readonly zone: ClockZone;
  private readonly view: () => ClockView;

  constructor(zone: ClockZone, view: () => ClockView) {
    super();
    this.zone = zone;
    this.view = view;
    this.name = zone.id;
    this.displayName = zone.pickerLabel;
    this.description = zone.description;
    this.groupName = zone.group;
  }

  /** Key face: map or circuit background with Location / Date / Time / Day / Timezone lines (each optional). */
  image(now: Date): string {
    const { offsetMinutes, settings } = this.view();
    const t = zoneTime(this.zone.timeZone, shifted(now, offsetMinutes), settings);
    // While time-travelling, the shift is always shown so shifted times aren't mistaken for now.
    const timezone = [settings.showTimezone ? t.gmt : '', offsetMinutes ? formatOffset(offsetMinutes) : '']
      .filter(Boolean)
      .join('  ');

    const lines: KeyLine[] = [];
    if (settings.showLocation) lines.push({ text: this.label(settings), size: 17, bold: true, tone: 'primary' });
    if (settings.showDate) lines.push({ text: t.date, size: 12, tone: 'secondary' });
    if (settings.showTime) lines.push({ text: t.time, size: 23, bold: true, tone: 'primary' });
    if (settings.showDay) lines.push({ text: t.weekday, size: 12, tone: 'secondary' });
    if (timezone) lines.push({ text: timezone, size: 11.5, tone: offsetMinutes ? 'highlight' : 'accent' });

    const shape = settings.showMap ? SHAPES[this.zone.id] : undefined;
    return keySvg(lines, shape, this.zone.shape.kind === 'circuit' ? 'f1' : 'world');
  }

  onKeyDown(): void {
    const { offsetMinutes, settings } = this.view();
    const t = zoneTime(this.zone.timeZone, shifted(new Date(), offsetMinutes), settings);
    copyToClipboard(`${this.label(settings)}, ${this.zone.country}: ${t.weekday} ${t.date} ${t.time} (${t.gmt})`);
  }

  private label(settings: Settings): string {
    return settings.locationNames[this.zone.id] ?? this.zone.city;
  }
}

function copyToClipboard(text: string): void {
  // Force UTF-8 so names like "São Paulo" survive when LPS starts us without a locale.
  const pbcopy = spawn('pbcopy', [], { env: { ...process.env, LANG: 'en_US.UTF-8' } });
  pbcopy.on('error', (error) => console.error('Clipboard copy failed:', error));
  pbcopy.stdin.end(text);
}
