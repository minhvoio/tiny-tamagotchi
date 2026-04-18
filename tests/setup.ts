import '@testing-library/jest-dom/vitest';

if (typeof globalThis.AnimationEvent === 'undefined') {
  class AnimationEventPolyfill extends Event {
    animationName: string;
    elapsedTime: number;
    pseudoElement: string;
    constructor(
      type: string,
      init: EventInit & {
        animationName?: string;
        elapsedTime?: number;
        pseudoElement?: string;
      } = {},
    ) {
      super(type, init);
      this.animationName = init.animationName ?? '';
      this.elapsedTime = init.elapsedTime ?? 0;
      this.pseudoElement = init.pseudoElement ?? '';
    }
  }
  (globalThis as unknown as { AnimationEvent: typeof AnimationEventPolyfill }).AnimationEvent =
    AnimationEventPolyfill;
}
