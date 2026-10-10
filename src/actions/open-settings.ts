import { CommandAction } from '@logitech/plugin-sdk';
import { execFile } from 'node:child_process';
import { SETTINGS_FILE } from '../settings';

export class OpenSettingsCommand extends CommandAction {
  readonly name = 'open_settings';
  displayName = 'World Clock Settings';
  description = 'Open settings.json to choose what the keys show and rename cities; saving applies instantly';

  onKeyDown(): void {
    execFile('open', ['-t', SETTINGS_FILE], (error) => {
      if (error) console.error('Could not open settings:', error);
    });
  }
}
