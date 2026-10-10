import type { Action, PluginSDK } from '@logitech/plugin-sdk';
import { ClockKeyAction } from './actions/clock-key';
import { OpenSettingsCommand } from './actions/open-settings';
import { BackToNowCommand, TimeTravelDial } from './actions/time-travel';
import { notifyImageChanged, serveActionImages } from './lps-bridge';
import { defaultSettings, readSettings, watchSettings, type Settings } from './settings';
import { CLOCKS } from './zones';

const STEP_MINUTES = 15;
const MAX_OFFSET_MINUTES = 24 * 60;

export class WorldClock {
  readonly actions: Action[];

  private readonly sdk: PluginSDK;
  private readonly clocks: ClockKeyAction[];
  private offsetMinutes = 0;
  private settings: Settings = defaultSettings();

  constructor(sdk: PluginSDK) {
    this.sdk = sdk;
    this.clocks = CLOCKS.map(
      (zone) => new ClockKeyAction(zone, () => ({ offsetMinutes: this.offsetMinutes, settings: this.settings })),
    );
    this.actions = [
      ...this.clocks,
      new TimeTravelDial((ticks) => this.setOffset(this.offsetMinutes + ticks * STEP_MINUTES)),
      new BackToNowCommand(() => this.setOffset(0)),
      new OpenSettingsCommand(),
    ];

    const byName = new Map(this.clocks.map((clock) => [clock.name, clock]));
    serveActionImages(sdk, (name) => {
      const clock = byName.get(name);
      return clock && (clock.face ??= clock.image(new Date()));
    });
  }

  /** Call after connect(): loads settings (applying edits live), then refreshes the keys every second. */
  start(): void {
    this.loadSettings();
    watchSettings(() => {
      this.loadSettings();
      this.refresh();
    });

    const tick = () => {
      this.refresh();
      // Re-align to the wall clock every second (+20 ms so we never wake just before the boundary).
      setTimeout(tick, 1000 - (Date.now() % 1000) + 20);
    };
    tick();
  }

  private loadSettings(): void {
    try {
      this.settings = readSettings();
    } catch (error) {
      console.error('Ignoring invalid settings.json; keeping previous settings.', error);
    }
  }

  private setOffset(minutes: number): void {
    const clamped = Math.max(-MAX_OFFSET_MINUTES, Math.min(MAX_OFFSET_MINUTES, minutes));
    if (clamped !== this.offsetMinutes) {
      this.offsetMinutes = clamped;
      this.refresh();
    }
  }

  private refresh(): void {
    const now = new Date();
    for (const clock of this.clocks) {
      const face = clock.image(now);
      if (face !== clock.face) {
        clock.face = face;
        notifyImageChanged(this.sdk, clock.name);
      }
    }
  }
}
