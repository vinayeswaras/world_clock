import type { Settings } from './settings';

export type ZoneTime = {
  /** e.g. "30 Sep 2026". */
  date: string;
  /** e.g. "21:05:09" or "9:05:09 PM", depending on settings. */
  time: string;
  /** e.g. "Wednesday". */
  weekday: string;
  /** e.g. "GMT+9", "GMT+5:30", or "GMT" for UTC. */
  gmt: string;
};

type TimeStyle = Pick<Settings, 'showSeconds' | 'use24Hour'>;

// Cached because every clock is re-rendered once per second.
const formatters = new Map<string, { date: Intl.DateTimeFormat; time: Intl.DateTimeFormat; day: Intl.DateTimeFormat }>();

function formattersFor(timeZone: string, style: TimeStyle) {
  const key = `${timeZone}|${style.showSeconds}|${style.use24Hour}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = {
      date: new Intl.DateTimeFormat('en-US', { timeZone, day: 'numeric', month: 'short', year: 'numeric' }),
      time: new Intl.DateTimeFormat(style.use24Hour ? 'en-GB' : 'en-US', {
        timeZone,
        hour: style.use24Hour ? '2-digit' : 'numeric',
        minute: '2-digit',
        ...(style.showSeconds ? { second: '2-digit' as const } : {}),
        hourCycle: style.use24Hour ? 'h23' : 'h12',
      }),
      day: new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', timeZoneName: 'shortOffset' }),
    };
    formatters.set(key, cached);
  }
  return cached;
}

export function zoneTime(timeZone: string, at: Date, style: TimeStyle): ZoneTime {
  const { date, time, day } = formattersFor(timeZone, style);
  const parts = day.formatToParts(at);
  const dateParts = date.formatToParts(at);
  const datePart = (type: Intl.DateTimeFormatPartTypes) => dateParts.find((part) => part.type === type)?.value ?? '';
  return {
    // Assembled by hand for a consistent "30 Sep 2026" (en-GB would give "Sept").
    date: `${datePart('day')} ${datePart('month')} ${datePart('year')}`,
    // ICU puts a narrow no-break space before AM/PM, which device fonts may lack.
    time: time.format(at).replace(/\u202f/g, ' '),
    weekday: parts.find((part) => part.type === 'weekday')?.value ?? '',
    gmt: parts.find((part) => part.type === 'timeZoneName')?.value ?? '',
  };
}

export function shifted(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** e.g. 150 -> "+2h30", -60 -> "-1h". */
export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const rest = abs % 60;
  return `${sign}${Math.floor(abs / 60)}h${rest ? String(rest).padStart(2, '0') : ''}`;
}
