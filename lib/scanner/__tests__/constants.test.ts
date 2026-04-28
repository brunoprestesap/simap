import { describe, expect, it } from "vitest";
import { BARCODE_FORMATS } from "../constants";

describe("BARCODE_FORMATS", () => {
  it("lista os formatos suportados pelo html5-qrcode", () => {
    expect(BARCODE_FORMATS.length).toBe(7);
    expect(BARCODE_FORMATS).toContain(5);
  });
});
