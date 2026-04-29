import { describe, it, expect } from "vitest";
import {
  processBarcodeReadAttempt,
  CONFIRM_WINDOW_MS,
  SCAN_COOLDOWN_MS,
} from "../barcode-acceptance";
import type { ScanBuffer, LastAccepted } from "../barcode-acceptance";

const empty: ScanBuffer = { code: "", count: 0, firstAt: 0 };
const none: LastAccepted = { code: "", at: 0 };

describe("processBarcodeReadAttempt", () => {
  it("inicializa buffer na primeira leitura e não aceita", () => {
    const r = processBarcodeReadAttempt("T123", 1_000, empty, none);
    expect(r.acceptedCode).toBeNull();
    expect(r.buf).toEqual({ code: "T123", count: 1, firstAt: 1_000 });
    expect(r.lastAccepted).toEqual(none);
  });

  it("aceita após segunda leitura do mesmo código na janela (threshold 2)", () => {
    const buf1: ScanBuffer = { code: "T123", count: 1, firstAt: 1_000 };
    const r2 = processBarcodeReadAttempt("T123", 1_100, buf1, none);
    expect(r2.acceptedCode).toBe("T123");
    expect(r2.buf).toEqual({ code: "", count: 0, firstAt: 0 });
    expect(r2.lastAccepted).toEqual({ code: "T123", at: 1_100 });
  });

  it("reseta o buffer quando o código muda", () => {
    const buf1: ScanBuffer = { code: "AAA", count: 1, firstAt: 1_000 };
    const r = processBarcodeReadAttempt("BBB", 1_050, buf1, none);
    expect(r.acceptedCode).toBeNull();
    expect(r.buf).toEqual({ code: "BBB", count: 1, firstAt: 1_050 });
  });

  it("ignora leituras repetidas do último aceite durante o cooldown", () => {
    const last: LastAccepted = { code: "T1", at: 10_000 };
    const buf: ScanBuffer = { code: "", count: 0, firstAt: 0 };
    const r = processBarcodeReadAttempt("T1", 10_000 + SCAN_COOLDOWN_MS - 1, buf, last);
    expect(r.acceptedCode).toBeNull();
    expect(r.buf).toBe(buf);
    expect(r.lastAccepted).toBe(last);
  });

  it("reconhece novo scan do mesmo código após o cooldown", () => {
    const last: LastAccepted = { code: "T1", at: 10_000 };
    const r1 = processBarcodeReadAttempt("T1", 10_000 + SCAN_COOLDOWN_MS, empty, last);
    expect(r1.acceptedCode).toBeNull();
    const r2 = processBarcodeReadAttempt("T1", 10_000 + SCAN_COOLDOWN_MS + 100, r1.buf, r1.lastAccepted);
    expect(r2.acceptedCode).toBe("T1");
  });

  it("não acumulador após a janela: trata como nova sequência (primeiro frame)", () => {
    const oldBuf: ScanBuffer = { code: "T123", count: 1, firstAt: 0 };
    const t = 0 + CONFIRM_WINDOW_MS + 1;
    const r = processBarcodeReadAttempt("T123", t, oldBuf, none);
    expect(r.acceptedCode).toBeNull();
    expect(r.buf).toEqual({ code: "T123", count: 1, firstAt: t });
  });

  it("com confirmThreshold 3, incrementa sem aceitar no segundo frame", () => {
    const buf1: ScanBuffer = { code: "Z", count: 1, firstAt: 100 };
    const r = processBarcodeReadAttempt("Z", 200, buf1, none, {
      confirmThreshold: 3,
    });
    expect(r.acceptedCode).toBeNull();
    expect(r.buf).toEqual({ code: "Z", count: 2, firstAt: 100 });
  });

  it("com confirmThreshold 3, aceita no terceiro frame", () => {
    const buf2: ScanBuffer = { code: "Z", count: 2, firstAt: 100 };
    const r = processBarcodeReadAttempt("Z", 300, buf2, none, {
      confirmThreshold: 3,
    });
    expect(r.acceptedCode).toBe("Z");
    expect(r.buf.code).toBe("");
  });
});
