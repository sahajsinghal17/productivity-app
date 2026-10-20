
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const resourceSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    homeSpaceId: {
      type: Schema.Types.ObjectId,
      ref: "Space",
      required: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    originalFilename: {
      type: String,
      required: true,
      maxlength: 255,
    },
    mimeType: {
      type: String,
      required: true,
      maxlength: 255,
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: 0,
      max: 20 * 1024 * 1024,
    },
    storageKey: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["pending", "available", "trashed", "failed"],
      default: "pending",
      required: true,
      index: true,
    },
    uploadExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    permanentDeletionStartedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

resourceSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
resourceSchema.index({ ownerId: 1, homeSpaceId: 1, status: 1 });
resourceSchema.index({ ownerId: 1, deletedAt: 1 });

export type Resource = InferSchemaType<typeof resourceSchema>;

export default mongoose.model("Resource", resourceSchema);
