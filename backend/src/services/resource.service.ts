
import crypto from "node:crypto";
import mongoose from "mongoose";
import {
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import Space from "../models/Space.js";
import Resource from "../models/Resource.js";
import {
  MAX_RESOURCE_SIZE_BYTES,
  validateResourceUploadInput,
  type ResourceUploadInput,
} from "./resource-validation.service.js";
import { r2Client, R2_BUCKET_NAME } from "../config/r2.js";
import type { ResourceStatus } from "./resource-validation.service.js";
import ResourceAttachment from "../models/ResourceAttachment.js";
import Task from "../models/Task.js";
import Project from "../models/Project.js";

const UPLOAD_URL_EXPIRES_SECONDS = 10 * 60;
const PENDING_UPLOAD_TTL_MS = 30 * 60 * 1000;

export async function createResourceUploadIntent(
  ownerId: string,
  input: ResourceUploadInput,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  const validated = validateResourceUploadInput(input);

  if (validated.sizeBytes > MAX_RESOURCE_SIZE_BYTES) {
    throw new Error("File cannot exceed 20 MiB.");
  }

  const space = await Space.findOne({
    _id: validated.homeSpaceId,
    ownerId,
  }).select("_id");

  if (!space) {
    throw new Error("Space not found or access denied.");
  }

  const resourceId = new mongoose.Types.ObjectId();
  const storageKey = `${ownerId}/${resourceId.toString()}/${crypto.randomUUID()}`;

  const uploadExpiresAt = new Date(
    Date.now() + PENDING_UPLOAD_TTL_MS,
  );

  const resource = await Resource.create({
    _id: resourceId,
    ownerId,
    homeSpaceId: space._id,
    displayName: validated.displayName,
    originalFilename: validated.originalFilename,
    mimeType: validated.mimeType,
    sizeBytes: validated.sizeBytes,
    storageKey,
    status: "pending",
    uploadExpiresAt,
    deletedAt: null,
  });

  try {
    const uploadUrl = await getSignedUrl(
      r2Client,
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: storageKey,
        ContentType: validated.mimeType,
        ContentLength: validated.sizeBytes,
      }),
      { expiresIn: UPLOAD_URL_EXPIRES_SECONDS },
    );

    return {
      resource: {
        id: resource._id.toString(),
        displayName: resource.displayName,
        originalFilename: resource.originalFilename,
        mimeType: resource.mimeType,
        sizeBytes: resource.sizeBytes,
        status: resource.status,
        uploadExpiresAt: resource.uploadExpiresAt,
      },
      upload: {
        url: uploadUrl,
        method: "PUT" as const,
        headers: {
          "Content-Type": validated.mimeType,
        },
        expiresInSeconds: UPLOAD_URL_EXPIRES_SECONDS,
      },
    };
  } catch (error) {
    resource.status = "failed";
    await resource.save();
    throw error;
  }
}

export async function completeResourceUpload(
  ownerId: string,
  resourceId: string,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(resourceId)) {
    throw new Error("Invalid resource ID.");
  }

  const resource = await Resource.findOne({
    _id: resourceId,
    ownerId,
    status: "pending",
  });

  if (!resource) {
    throw new Error("Pending resource not found or access denied.");
  }

  if (
    !resource.uploadExpiresAt ||
    resource.uploadExpiresAt.getTime() <= Date.now()
  ) {
    throw new Error("Upload intent has expired.");
  }

  const head = await r2Client.send(
    new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: resource.storageKey,
    }),
  );

  if (head.ContentLength !== resource.sizeBytes) {
    throw new Error("Uploaded file size does not match the declared size.");
  }

  const response = await r2Client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: resource.storageKey,
      Range: "bytes=0-4095",
    }),
  );

  if (!response.Body) {
    throw new Error("Could not inspect the uploaded file.");
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  try {
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      const buffer = Buffer.from(chunk);
      totalBytes += buffer.length;

      if (totalBytes > 4096) {
        chunks.push(buffer.subarray(0, 4096 - (totalBytes - buffer.length)));
        break;
      }

      chunks.push(buffer);
    }
  } finally {
        const body = response.Body;

        if (body && "destroy" in body && typeof body.destroy === "function") {
            body.destroy();
        }
    }

  const bytes = Buffer.concat(chunks);

  if (bytes.length === 0) {
    throw new Error("The uploaded file is empty or invalid.");
  }

  // Validate the actual bytes, not only browser-provided metadata.
  const { validateResourceFile } = await import(
    "./resource-file-validation.service.js"
  );

  validateResourceFile({
    filename: resource.originalFilename,
    claimedMimeType: resource.mimeType,
    bytes,
  });

  resource.status = "available";
  resource.uploadExpiresAt = null;
  await resource.save();

  return {
    id: resource._id.toString(),
    displayName: resource.displayName,
    originalFilename: resource.originalFilename,
    mimeType: resource.mimeType,
    sizeBytes: resource.sizeBytes,
    status: resource.status,
  };
}

export type ListResourcesOptions = {
  spaceId?: string;
  page?: number;
  limit?: number;
  status?: ResourceStatus;
};

export async function listResources(
  ownerId: string,
  options: ListResourcesOptions = {},
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  const page = options.page ?? 1;
  const limit = options.limit ?? 20;

  if (!Number.isSafeInteger(page) || page < 1) {
    throw new Error("Invalid page.");
  }

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Invalid limit.");
  }

  const filter: Record<string, unknown> = {
    ownerId,
    status: options.status ?? "available",
    permanentDeletionStartedAt: null,
  };

  if (options.spaceId !== undefined) {
    if (!mongoose.isValidObjectId(options.spaceId)) {
      throw new Error("Invalid space ID.");
    }

    const space = await Space.findOne({
      _id: options.spaceId,
      ownerId,
    }).select("_id");

    if (!space) {
      throw new Error("Space not found or access denied.");
    }

    filter.homeSpaceId = space._id;
  }

  const [resources, total] = await Promise.all([
    Resource.find(filter)
      .select(
        "_id homeSpaceId displayName originalFilename mimeType sizeBytes status createdAt updatedAt",
      )
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Resource.countDocuments(filter),
  ]);

  return {
    resources: resources.map((resource) => ({
      id: resource._id.toString(),
      homeSpaceId: resource.homeSpaceId.toString(),
      displayName: resource.displayName,
      originalFilename: resource.originalFilename,
      mimeType: resource.mimeType,
      sizeBytes: resource.sizeBytes,
      status: resource.status,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getResourceById(
  ownerId: string,
  resourceId: string,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(resourceId)) {
    throw new Error("Invalid resource ID.");
  }

  const resource = await Resource.findOne({
    _id: resourceId,
    ownerId,
    status: "available",
    permanentDeletionStartedAt: null,
  }).select(
    "_id homeSpaceId displayName originalFilename mimeType sizeBytes status createdAt updatedAt",
  );

  if (!resource) {
    throw new Error("Resource not found or access denied.");
  }

  return {
    id: resource._id.toString(),
    homeSpaceId: resource.homeSpaceId.toString(),
    displayName: resource.displayName,
    originalFilename: resource.originalFilename,
    mimeType: resource.mimeType,
    sizeBytes: resource.sizeBytes,
    status: resource.status,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  };
}

export async function renameResource(
  ownerId: string,
  resourceId: string,
  displayName: unknown,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(resourceId)) {
    throw new Error("Invalid resource ID.");
  }

  if (typeof displayName !== "string" || !displayName.trim()) {
    throw new Error("Display name is required.");
  }

  const trimmedName = displayName.trim();

  if (trimmedName.length > 200) {
    throw new Error("Display name cannot exceed 200 characters.");
  }

  const resource = await Resource.findOne({
    _id: resourceId,
    ownerId,
    status: "available",
    permanentDeletionStartedAt: null,
  });

  if (!resource) {
    throw new Error("Resource not found or access denied.");
  }

  resource.displayName = trimmedName;
  await resource.save();

  return {
    id: resource._id.toString(),
    displayName: resource.displayName,
    originalFilename: resource.originalFilename,
    mimeType: resource.mimeType,
    sizeBytes: resource.sizeBytes,
    status: resource.status,
    updatedAt: resource.updatedAt,
  };
}

export async function createResourceDownloadUrl(
  ownerId: string,
  resourceId: string,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(resourceId)) {
    throw new Error("Invalid resource ID.");
  }

  const resource = await Resource.findOne({
    _id: resourceId,
    ownerId,
    status: "available",
    permanentDeletionStartedAt: null,
  }).select("_id storageKey originalFilename mimeType");

  if (!resource) {
    throw new Error("Resource not found or access denied.");
  }

  const expiresInSeconds = 5 * 60;

  const downloadUrl = await getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: resource.storageKey,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(
        resource.originalFilename,
      )}"`,
      ResponseContentType: resource.mimeType,
    }),
    { expiresIn: expiresInSeconds },
  );

  return {
    resourceId: resource._id.toString(),
    downloadUrl,
    expiresInSeconds,
  };
}

export async function trashResource(
  ownerId: string,
  resourceId: string,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(resourceId)) {
    throw new Error("Invalid resource ID.");
  }

  const resource = await Resource.findOne({
    _id: resourceId,
    ownerId,
    status: "available",
    permanentDeletionStartedAt: null,
  });

  if (!resource) {
    throw new Error("Resource not found or access denied.");
  }

  resource.status = "trashed";
  resource.deletedAt = new Date();

  await resource.save();

  return {
    id: resource._id.toString(),
    displayName: resource.displayName,
    status: resource.status,
    deletedAt: resource.deletedAt,
  };
}

export async function restoreResource(
  ownerId: string,
  resourceId: string,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(resourceId)) {
    throw new Error("Invalid resource ID.");
  }

  const resource = await Resource.findOne({
    _id: resourceId,
    ownerId,
    status: "trashed",
    permanentDeletionStartedAt: null,
  });

  if (!resource) {
    throw new Error("Trashed resource not found or access denied.");
  }

  resource.status = "available";
  resource.deletedAt = null;

  await resource.save();

  return {
    id: resource._id.toString(),
    displayName: resource.displayName,
    status: resource.status,
    deletedAt: resource.deletedAt,
  };
}

export async function permanentlyDeleteResource(
  ownerId: string,
  resourceId: string,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(resourceId)) {
    throw new Error("Invalid resource ID.");
  }

  // Atomically claim the deletion, or resume a previous attempt.
  const resource = await Resource.findOneAndUpdate(
    {
      _id: resourceId,
      ownerId,
      status: "trashed",
      $or: [
        { permanentDeletionStartedAt: null },
        { permanentDeletionStartedAt: { $exists: false } },
      ],
    },
    {
      $set: { permanentDeletionStartedAt: new Date() },
    },
    { new: true },
  ).select("_id storageKey displayName");

  // If another attempt already claimed deletion, allow a retry to
  // resume it using the same stored object key.
  const existingDeletion = resource
    ? null
    : await Resource.findOne({
        _id: resourceId,
        ownerId,
        status: "trashed",
        permanentDeletionStartedAt: { $ne: null },
      }).select("_id storageKey displayName");

  const target = resource ?? existingDeletion;

  if (!target) {
    throw new Error("Trashed resource not found or access denied.");
  }

  // Deleting the same R2 key again is safe if a previous attempt
  // already removed the object.
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");

  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: target.storageKey,
    }),
  );

  // Remove relationships only after the R2 deletion request succeeds.
  await ResourceAttachment.deleteMany({
    resourceId: target._id,
    ownerId,
  });

  // Delete metadata only after the object and attachments are cleaned up.
  await Resource.deleteOne({
    _id: target._id,
    ownerId,
    status: "trashed",
    permanentDeletionStartedAt: { $ne: null },
  });

  return {
    id: target._id.toString(),
    displayName: target.displayName,
    permanentlyDeleted: true,
  };
}

export async function attachResource(
  ownerId: string,
  resourceId: string,
  targetType: "task" | "project",
  targetId: string,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(resourceId)) {
    throw new Error("Invalid resource ID.");
  }

  if (!mongoose.isValidObjectId(targetId)) {
    throw new Error("Invalid target ID.");
  }

  if (targetType !== "task" && targetType !== "project") {
    throw new Error("Invalid target type.");
  }

  const resource = await Resource.findOne({
    _id: resourceId,
    ownerId,
    status: "available",
    permanentDeletionStartedAt: null,
  }).select("_id homeSpaceId");

  if (!resource) {
    throw new Error("Resource not found or access denied.");
  }

  let targetSpaceId: mongoose.Types.ObjectId;

  if (targetType === "task") {
    const task = await Task.findOne({
      _id: targetId,
      ownerId,
      deletedAt: null,
    }).select("_id spaceId");

    if (!task) {
      throw new Error("Task not found or access denied.");
    }

    targetSpaceId = task.spaceId;
  } else {
    const project = await Project.findOne({
      _id: targetId,
      ownerId,
      deletedAt: null,
    }).select("_id spaceId");

    if (!project) {
      throw new Error("Project not found or access denied.");
    }

    targetSpaceId = project.spaceId;
  }

  const attachment = await ResourceAttachment.findOneAndUpdate(
    {
      resourceId: resource._id,
      targetType,
      targetId,
    },
    {
      $setOnInsert: {
        resourceId: resource._id,
        ownerId,
        spaceId: targetSpaceId,
        targetType,
        targetId: new mongoose.Types.ObjectId(targetId),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  return {
    id: attachment._id.toString(),
    resourceId: attachment.resourceId.toString(),
    targetType: attachment.targetType,
    targetId: attachment.targetId.toString(),
    spaceId: attachment.spaceId.toString(),
    createdAt: attachment.createdAt,
  };
}

export async function listResourceAttachments(
  ownerId: string,
  resourceId: string,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(resourceId)) {
    throw new Error("Invalid resource ID.");
  }

  const resource = await Resource.findOne({
    _id: resourceId,
    ownerId,
    status: { $in: ["available", "trashed"] },
  }).select("_id");

  if (!resource) {
    throw new Error("Resource not found or access denied.");
  }

  const attachments = await ResourceAttachment.find({
    resourceId: resource._id,
    ownerId,
  })
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  return {
    attachments: attachments.map((attachment) => ({
      id: attachment._id.toString(),
      resourceId: attachment.resourceId.toString(),
      targetType: attachment.targetType,
      targetId: attachment.targetId.toString(),
      spaceId: attachment.spaceId.toString(),
      createdAt: attachment.createdAt,
    })),
  };
}

export async function detachResource(
  ownerId: string,
  resourceId: string,
  attachmentId: string,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(resourceId)) {
    throw new Error("Invalid resource ID.");
  }

  if (!mongoose.isValidObjectId(attachmentId)) {
    throw new Error("Invalid attachment ID.");
  }

  const resource = await Resource.findOne({
    _id: resourceId,
    ownerId,
    status: { $in: ["available", "trashed"] },
  }).select("_id");

  if (!resource) {
    throw new Error("Resource not found or access denied.");
  }

  const attachment = await ResourceAttachment.findOneAndDelete({
    _id: attachmentId,
    resourceId: resource._id,
    ownerId,
  });

  if (!attachment) {
    throw new Error("Resource attachment not found or access denied.");
  }

  return {
    id: attachment._id.toString(),
    resourceId: attachment.resourceId.toString(),
    targetType: attachment.targetType,
    targetId: attachment.targetId.toString(),
    detached: true,
  };
}

export async function listTargetAttachments(
  ownerId: string,
  targetType: "task" | "project",
  targetId: string,
) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw new Error("Invalid user ID.");
  }

  if (!mongoose.isValidObjectId(targetId)) {
    throw new Error("Invalid target ID.");
  }

  let targetSpaceId: mongoose.Types.ObjectId;

  if (targetType === "task") {
    const task = await Task.findOne({
      _id: targetId,
      ownerId,
      deletedAt: null,
    }).select("_id spaceId");

    if (!task) {
      throw new Error("Task not found or access denied.");
    }

    targetSpaceId = task.spaceId;
  } else {
    const project = await Project.findOne({
      _id: targetId,
      ownerId,
      deletedAt: null,
    }).select("_id spaceId");

    if (!project) {
      throw new Error("Project not found or access denied.");
    }

    targetSpaceId = project.spaceId;
  }

  const attachments = await ResourceAttachment.find({
    ownerId,
    targetType,
    targetId,
  })
    .sort({ createdAt: -1 })
    .lean();

  const resourceIds = attachments.map(
    (attachment) => attachment.resourceId,
  );

  const resources = await Resource.find({
    _id: { $in: resourceIds },
    ownerId,
    status: "available",
    permanentDeletionStartedAt: null,
  }).lean();

  const resourceMap = new Map(
    resources.map((resource) => [
      resource._id.toString(),
      resource,
    ]),
  );

  return attachments
    .filter((attachment) =>
      resourceMap.has(attachment.resourceId.toString()),
    )
    .map((attachment) => ({
      attachmentId: attachment._id.toString(),
      targetSpaceId: targetSpaceId.toString(),
      resource: resourceMap.get(
        attachment.resourceId.toString(),
      ),
    }));
}