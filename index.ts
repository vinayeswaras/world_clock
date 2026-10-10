import { PluginSDK } from '@logitech/plugin-sdk';
import { WorldClock } from './src/world-clock';

const pluginSDK = new PluginSDK();
const worldClock = new WorldClock(pluginSDK);

// All actions must be registered before connect().
for (const action of worldClock.actions) {
  pluginSDK.registerAction(action);
}

await pluginSDK.connect();
worldClock.start();
