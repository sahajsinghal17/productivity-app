
export const MAX_RESOURCE_SIZE_BYTES = 20 * 1024 * 1024;

export const RESOURCE_STATUSES = [
  "pending",
  "available",
  "trashed",
  "failed",
] as const;

export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];

export type ResourceUploadInput = {
  displayName?: unknown;
  originalFilename?: unknown;
  mimeType?: unknown;
  sizeBytes?: unknown;
  homeSpaceId?: unknown;
};

export type ValidatedResourceUploadInput = {
  displayName: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  homeSpaceId: string;
};

// Initial denylist for common dangerous or executable formats.
// Additional content validation is performed on uploaded bytes.
const BLOCKED_EXTENSIONS = new Set([
  ".ade",
  ".adp",
  ".apk",
  ".app",
  ".bat",
  ".bin",
  ".cab",
  ".cmd",
  ".com",
  ".cpl",
  ".dll",
  ".dmg",
  ".exe",
  ".hta",
  ".img",
  ".iso",
  ".jar",
  ".js",
  ".jse",
  ".lnk",
  ".msi",
  ".msp",
  ".mst",
  ".ps1",
  ".reg",
  ".scr",
  ".sh",
  ".sys",
  ".vbe",
  ".vbs",
  ".wsf",
  ".wsh",
]);

const MIME_TYPE_PATTERN =
  /^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/;

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot > -1 ? filename.slice(lastDot).toLowerCase() : "";
}

function validateFilename(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Original filename must be a string.");
  }

  const filename = value.trim();

  if (
    !filename ||
    filename.length > 255 ||
    filename === "." ||
    filename === ".." ||
    /[\/\\\u0000-\u001f\u007f]/.test(filename)
  ) {
    throw new Error("Invalid original filename.");
  }

  if (BLOCKED_EXTENSIONS.has(getExtension(filename))) {
    throw new Error("This file type is not allowed.");
  }

  return filename;
}

function validateDisplayName(value: unknown, fallback: string): string {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "string") {
    throw new Error("Display name must be a string.");
  }

  const displayName = value.trim();

  if (!displayName) {
    throw new Error("Display name is required.");
  }

  if (displayName.length > 200) {
    throw new Error("Display name cannot exceed 200 characters.");
  }

  return displayName;
}

function validateMimeType(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("MIME type must be a string.");
  }

  const mimeType = value.trim().toLowerCase();

  if (
    mimeType.length > 255 ||
    !MIME_TYPE_PATTERN.test(mimeType) ||
    mimeType === "application/x-msdownload" ||
    mimeType === "application/x-executable"
  ) {
    throw new Error("Invalid or disallowed MIME type.");
  }

  return mimeType;
}

function validateSize(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > MAX_RESOURCE_SIZE_BYTES
  ) {
    throw new Error("File size must be between 1 byte and 20 MiB.");
  }

  return value;
}

function validateObjectId(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) {
    throw new Error(`${field} must be a valid ID.`);
  }

  return value;
}

export function validateResourceUploadInput(
  input: ResourceUploadInput,
): ValidatedResourceUploadInput {
  const originalFilename = validateFilename(input.originalFilename);
  const displayName = validateDisplayName(
    input.displayName,
    originalFilename,
  );

  return {
    displayName,
    originalFilename,
    mimeType: validateMimeType(input.mimeType),
    sizeBytes: validateSize(input.sizeBytes),
    homeSpaceId: validateObjectId(input.homeSpaceId, "homeSpaceId"),
  };
}
