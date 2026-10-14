import mongoose, { Schema, type InferSchemaType } from "mongoose";

const spaceSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

spaceSchema.index(
  { ownerId: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true },
  },
);

export type Space = InferSchemaType<typeof spaceSchema>;

export default mongoose.model("Space", spaceSchema);