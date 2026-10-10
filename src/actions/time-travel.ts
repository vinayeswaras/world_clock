import { AdjustmentAction, CommandAction, type AdjustmentActionExecuteEvent } from '@logitech/plugin-sdk';

/** Dial: shift every clock forward/back to answer "what time is it there when it's X here?". */
export class TimeTravelDial extends AdjustmentAction {
  readonly name = 'time_travel';
  displayName = 'Time Travel';
  description = 'Turn to move every world clock forward or back in 15-minute steps';
  readonly hasReset = false;

  private readonly onTurn: (ticks: number) => void;

  constructor(onTurn: (ticks: number) => void) {
    super();
    this.onTurn = onTurn;
  }

  execute(event: AdjustmentActionExecuteEvent): void {
    this.onTurn(event.tick);
  }
}

export class BackToNowCommand extends CommandAction {
  readonly name = 'back_to_now';
  displayName = 'Back to Now';
  description = 'Reset Time Travel so every clock shows the current time';

  private readonly onPress: () => void;

  constructor(onPress: () => void) {
    super();
    this.onPress = onPress;
  }

  onKeyDown(): void {
    this.onPress();
  }
}
