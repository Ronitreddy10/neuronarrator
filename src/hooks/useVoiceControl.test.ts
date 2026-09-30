import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVoiceControl } from "./useVoiceControl";

class MockRecognition {
  static current: MockRecognition;
  onstart?: () => void;
  onend?: () => void;
  onresult?: (event: { results: { isFinal: boolean; 0: { transcript: string } }[] }) => void;
  constructor() { MockRecognition.current = this; }
  start() { this.onstart?.(); }
  stop() { this.onend?.(); }
  abort() {}
  respond(transcript: string) {
    this.onresult?.({ results: [{ isFinal: true, 0: { transcript } }] });
    this.onend?.();
  }
}

describe("push-to-talk command routing", () => {
  beforeEach(() => {
    vi.stubGlobal("SpeechRecognition", MockRecognition);
    vi.stubGlobal("speechSynthesis", undefined);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each([
    ["find my money", "finder", "money"],
    ["where is my currency", "finder", "currency"],
    ["find my keys", "finder", "keys"],
    ["count notes", "currency", ""],
    ["how much money", "currency", ""],
    ["describe", "standard", ""],
  ] as const)("routes '%s' to %s", (command, mode, target) => {
    const { result } = renderHook(() => useVoiceControl());
    act(() => result.current.startListening());
    act(() => MockRecognition.current.respond(command));
    expect(result.current.commandMode).toBe(mode);
    expect(result.current.targetItem).toBe(target);
  });
});
