import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { Html5Qrcode } from "html5-qrcode";
import { Scanner } from "./Scanner";

function mockMatchMedia() {
  return vi.fn().mockImplementation((q: string) => ({
    matches: q === "(pointer: coarse)" ? false : q === "(min-width: 1024px)",
    media: q,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

vi.mock("html5-qrcode", () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    start: vi.fn(
      async (
        _camera: unknown,
        _config: unknown,
        onSuccess: (text: string) => void,
      ) => {
        await Promise.resolve();
        onSuccess("12345");
        await Promise.resolve();
        onSuccess("12345");
      },
    ),
    stop: vi.fn(async () => {}),
  })),
}));

describe("Scanner", () => {
  beforeEach(() => {
    globalThis.window.matchMedia = mockMatchMedia();
    vi.mocked(Html5Qrcode).mockClear();
  });

  it("integra html5-qrcode e dispara onScan após confirmação dupla", async () => {
    const onScan = vi.fn();
    render(<Scanner onScan={onScan} active />);

    await waitFor(
      () => {
        expect(onScan).toHaveBeenCalledWith("12345");
      },
      { timeout: 5_000 },
    );
  });

  it("não retenta start após AbortError causado por desmontagem", async () => {
    let rejectStart!: (err: Error) => void;
    const pendingStart = new Promise<void>((_, reject) => {
      rejectStart = reject;
    });

    const mockStart = vi.fn()
      .mockReturnValueOnce(pendingStart)
      .mockResolvedValue(undefined);
    const mockStop = vi.fn().mockResolvedValue(undefined);

    vi.mocked(Html5Qrcode).mockImplementationOnce(
      () =>
        ({
          start: mockStart,
          stop: mockStop,
        }) as unknown as InstanceType<typeof Html5Qrcode>,
    );

    const { unmount } = render(<Scanner onScan={vi.fn()} active />);

    // Wait until start() is in-flight
    await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1));

    // Unmount sets cancelled = true and calls stop()
    unmount();

    // Simulate browser aborting video.play() because the element was removed
    rejectStart(new DOMException("The play() request was interrupted because the media was removed from the document", "AbortError"));

    await new Promise<void>((r) => setTimeout(r, 50));

    // start() must not be retried after an AbortError from intentional cleanup
    expect(mockStart).toHaveBeenCalledTimes(1);
  });
});
