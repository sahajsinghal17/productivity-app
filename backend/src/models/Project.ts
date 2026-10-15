
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },
    status: {
      type: String,
      enum: ["planning", "active", "on_hold", "completed", "cancelled"],
      default: "planning",
      required: true,
    },
    color: {
      type: String,
      default: "#6366f1",
      match: /^#[0-9A-Fa-f]{6}$/,
    },
    icon: {
      type: String,
      default: "folder",
      maxlength: 50,
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
    startDate: {
      type: Date,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

projectSchema.index({ ownerId: 1, spaceId: 1, createdAt: -1 });
projectSchema.index({ ownerId: 1, status: 1 });

export type Project = InferSchemaType<typeof projectSchema>;

export default mongoose.model("Project", projectSchema);
