
import path from "node:path";

const BLOCKED_EXTENSIONS = new Set([
  ".ade", ".adp", ".apk", ".app", ".bat", ".bin", ".cab",
  ".cmd", ".com", ".cpl", ".dll", ".dmg", ".exe", ".hta",
  ".img", ".iso", ".jar", ".js", ".jse", ".lnk", ".msi",
  ".msp", ".mst", ".ps1", ".reg", ".scr", ".sh", ".svg",
  ".sys", ".vbe", ".vbs", ".wsf", ".wsh",
]);

type SignatureRule = {
  mimeTypes: string[];
  matches: (bytes: Buffer) => boolean;
};

const signatureRules: SignatureRule[] = [
  {
    mimeTypes: ["application/pdf"],
    matches: (b) => b.subarray(0, 5).toString() === "%PDF-",
  },
  {
    mimeTypes: ["image/png"],
    matches: (b) =>
      b.length >= 8 &&
      b.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      ),
  },
  {
    mimeTypes: ["image/jpeg"],
    matches: (b) =>
      b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mimeTypes: ["image/gif"],
    matches: (b) => {
      const header = b.subarray(0, 6).toString();
      return header === "GIF87a" || header === "GIF89a";
    },
  },
  {
    mimeTypes: ["image/webp"],
    matches: (b) =>
      b.length >= 12 &&
      b.subarray(0, 4).toString() === "RIFF" &&
      b.subarray(8, 12).toString() === "WEBP",
  },
  {
    mimeTypes: ["application/zip"],
    matches: (b) =>
      b.length >= 4 &&
      b[0] === 0x50 &&
      b[1] === 0x4b &&
      [0x03, 0x05, 0x07].includes(b[2]) &&
      [0x04, 0x06, 0x08].includes(b[3]),
  },
  {
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    matches: (b) =>
      b.length >= 4 &&
      b[0] === 0x50 &&
      b[1] === 0x4b &&
      [0x03, 0x05, 0x07].includes(b[2]) &&
      [0x04, 0x06, 0x08].includes(b[3]),
  },
  {
    mimeTypes: ["audio/mpeg"],
    matches: (b) =>
      b.length >= 3 &&
      (b.subarray(0, 3).toString() === "ID3" ||
        (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)),
  },
  {
    mimeTypes: ["audio/wav", "audio/x-wav"],
    matches: (b) =>
      b.length >= 12 &&
      b.subarray(0, 4).toString() === "RIFF" &&
      b.subarray(8, 12).toString() === "WAVE",
  },
  {
    mimeTypes: ["audio/ogg", "video/ogg"],
    matches: (b) => b.subarray(0, 4).toString() === "OggS",
  },
  {
    mimeTypes: ["video/mp4", "audio/mp4"],
    matches: (b) =>
      b.length >= 12 && b.subarray(4, 8).toString() === "ftyp",
  },
  {
    mimeTypes: ["video/webm", "audio/webm"],
    matches: (b) =>
      b.length >= 4 &&
      b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
  },
];

export type ResourceFileValidationInput = {
  filename: string;
  claimedMimeType: string;
  bytes: Buffer;
};

export function validateResourceFile(
  input: ResourceFileValidationInput,
): void {
  const filename = path.basename(input.filename);
  const extension = path.extname(filename).toLowerCase();

  if (!filename || BLOCKED_EXTENSIONS.has(extension)) {
    throw new Error("This file type is not allowed.");
  }

  if (!Buffer.isBuffer(input.bytes) || input.bytes.length === 0) {
    throw new Error("The uploaded file is empty or invalid.");
  }

  const claimedMimeType = input.claimedMimeType.toLowerCase();

  const matchingRules = signatureRules.filter((rule) =>
    rule.mimeTypes.includes(claimedMimeType),
  );

  if (matchingRules.length === 0) {
    throw new Error(
      "This file format is not supported by the current signature validator.",
    );
  }

  if (!matchingRules.some((rule) => rule.matches(input.bytes))) {
    throw new Error("File contents do not match the claimed file type.");
  }
}
