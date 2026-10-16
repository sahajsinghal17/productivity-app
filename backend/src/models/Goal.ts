
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const goalSchema = new Schema(
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
      enum: ["active", "completed", "on_hold", "cancelled"],
      default: "active",
      required: true,
    },

    color: {
      type: String,
      default: "#6366f1",
      match: /^#[0-9A-Fa-f]{6}$/,
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

    parentGoalId: {
      type: Schema.Types.ObjectId,
      ref: "Goal",
      default: null,
      index: true,
    },

    projectIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "Project",
        },
      ],
      default: [],
    },

    startDate: {
      type: Date,
      default: null,
    },

    targetDate: {
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
  {
    timestamps: true,
  },
);

// Efficiently retrieve goals within a space.
goalSchema.index({ ownerId: 1, spaceId: 1, createdAt: -1 });

// Efficiently retrieve child goals.
goalSchema.index({ ownerId: 1, parentGoalId: 1 });

export type GoalDocument = InferSchemaType<typeof goalSchema>;

export default mongoose.model("Goal", goalSchema);
