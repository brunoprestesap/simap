/**
 * Html5QrcodeSupportedFormats numeric values (avoids top-level import of
 * html5-qrcode which accesses `document` and breaks SSR).
 */
export const BARCODE_FORMATS = [
  5, // CODE_128
  3, // CODE_39
  4, // CODE_93
  8, // ITF
  2, // CODABAR
  9, // EAN_13
  10, // EAN_8
] as const;
