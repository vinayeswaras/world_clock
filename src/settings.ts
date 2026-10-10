import { existsSync, mkdirSync, readFileSync, watch, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { CLOCKS } from './zones';

export type Settings = {
  /** The five key lines, top to bottom. */
  showLocation: boolean;
  showDate: boolean;
  showTime: boolean;
  showDay: boolean;
  showTimezone: boolean;
  showSeconds: boolean;
  use24Hour: boolean;
  /** Country outline (world clocks) or circuit layout (F1) behind the text. */
  showMap: boolean;
  /** Key label per clock action id, e.g. { "clock_asia_kolkata": "Chennai", "f1_suzuka": "Suzuka" }. */
  locationNames: Record<string, string>;
};

const FLAGS = ['showLocation', 'showDate', 'showTime', 'showDay', 'showTimezone', 'showSeconds', 'use24Hour', 'showMap'] as const;

// Same folder Logi Plugin Service hands C# plugins via GetPluginDataDirectory().
const SETTINGS_DIR = join(
  homedir(), 'Library', 'Application Support', 'Logi', 'LogiPluginService', 'PluginData',
  process.env.LPS_PLUGIN_NAME ?? 'WorldClock',
);
export const SETTINGS_FILE = join(SETTINGS_DIR, 'settings.json');

export function defaultSettings(): Settings {
  return {
    showLocation: true,
    showDate: true,
    showTime: true,
    showDay: true,
    showTimezone: true,
    showSeconds: true,
    use24Hour: true,
    showMap: true,
    locationNames: Object.fromEntries(CLOCKS.map((clock) => [clock.id, clock.city])),
  };
}

/**
 * Reads settings.json. Rewrites it with defaults filled in when it's missing or incomplete
 * (e.g. after an update adds clocks), so every option stays visible to edit. Throws on invalid JSON.
 */
export function readSettings(): Settings {
  const settings = defaultSettings();
  const complete = existsSync(SETTINGS_FILE) && merge(settings, JSON.parse(readFileSync(SETTINGS_FILE, 'utf8')));
  if (!complete) {
    mkdirSync(SETTINGS_DIR, { recursive: true });
    writeFileSync(SETTINGS_FILE, `${JSON.stringify(settings, null, 2)}\n`);
  }
  return settings;
}

/** Copies valid values from the parsed file into settings; returns false if any setting was missing or invalid. */
function merge(settings: Settings, file: unknown): boolean {
  if (typeof file !== 'object' || file === null) return false;
  const values = file as Record<string, unknown>;
  let complete = true;

  for (const flag of FLAGS) {
    const value = values[flag];
    if (typeof value === 'boolean') settings[flag] = value;
    else complete = false;
  }

  const names = (typeof values.locationNames === 'object' && values.locationNames) || {};
  for (const id of Object.keys(settings.locationNames)) {
    const name = (names as Record<string, unknown>)[id];
    if (typeof name === 'string' && name.trim()) settings.locationNames[id] = name.trim();
    else complete = false;
  }
  return complete;
}

/** Calls onChange shortly after settings.json is saved. Watches the folder so editors that replace the file still trigger. */
export function watchSettings(onChange: () => void): void {
  let debounce: NodeJS.Timeout | undefined;
  watch(SETTINGS_DIR, () => {
    clearTimeout(debounce);
    debounce = setTimeout(onChange, 150);
  });
}
