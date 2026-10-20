
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const resourceAttachmentSchema = new Schema(
  {
    resourceId: {
      type: Schema.Types.ObjectId,
      ref: "Resource",
      required: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    spaceId: {
      type: Schema.Types.ObjectId,
      ref: "Space",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["task", "project"],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent attaching the same resource to the same target twice.
resourceAttachmentSchema.index(
  { resourceId: 1, targetType: 1, targetId: 1 },
  { unique: true },
);

// Efficiently list attachments for a task or project.
resourceAttachmentSchema.index({
  ownerId: 1,
  targetType: 1,
  targetId: 1,
  createdAt: -1,
});

resourceAttachmentSchema.index({
  ownerId: 1,
  resourceId: 1,
  createdAt: -1,
});

export type ResourceAttachment = InferSchemaType<
  typeof resourceAttachmentSchema
>;

export default mongoose.model("ResourceAttachment", resourceAttachmentSchema);
