import type { PluginSDK } from '@logitech/plugin-sdk';

// The public Node SDK (0.1.1) can't push key updates or serve key images, so this talks to Logi Plugin Service
// directly. Message shapes mirror the service's own requests (verified against Logi Plugin Service 6.4).
type Internals = {
  _sendMessage(message: object): void;
  _dispatcher: { dispatch(data: Buffer, storage: unknown): Promise<unknown> };
};

let nextMessageId = 1_000_000;

/** Marks a key image stale; the service then re-requests it through GetActionImage. */
export function notifyImageChanged(sdk: PluginSDK, actionName: string): void {
  (sdk as unknown as Internals)._sendMessage({
    id: nextMessageId++,
    name: 'ActionImageChanged',
    messageType: 'Event',
    parameters: { pluginName: process.env.LPS_PLUGIN_NAME, actionName, actionParameter: null },
  });
}

/** Answers GetActionImage with an SVG from `render`; actions it returns undefined for keep the SDK's default (text). */
export function serveActionImages(sdk: PluginSDK, render: (actionName: string) => string | undefined): void {
  const internals = sdk as unknown as Internals;
  const dispatcher = internals._dispatcher;
  const dispatch = dispatcher.dispatch.bind(dispatcher);

  dispatcher.dispatch = async (data, storage) => {
    const message = JSON.parse(data.toString('utf8'));
    if (message.name === 'GetActionImage' && message.messageType === 'Request') {
      const svg = render(String(message.parameters?.actionName));
      if (svg !== undefined) {
        internals._sendMessage({
          id: message.id,
          name: 'GetActionImage',
          messageType: 'Response',
          data: { image: Buffer.from(svg, 'utf8').toString('base64') },
          failed: false,
          errorMessage: '',
          errorCode: 0,
        });
        return undefined;
      }
    }
    return dispatch(data, storage);
  };
}
