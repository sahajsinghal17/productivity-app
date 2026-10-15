import type { Request, Response } from "express";
import Space from "../models/Space.js";

export async function getSpaces(
  req: Request,
  res: Response,
): Promise<void> {
  const ownerId = req.session.userId;

  if (!ownerId) {
    res.status(401).json({
      status: "error",
      message: "Authentication required. Please log in.",
    });
    return;
  }

  try {
    const spaces = await Space.find({ ownerId })
      .select("_id name isDefault")
      .sort({ isDefault: -1, name: 1 })
      .lean();

    res.status(200).json({
      status: "success",
      data: { spaces },
    });
  } catch {
    res.status(500).json({
      status: "error",
      message: "Unable to retrieve spaces.",
    });
  }
}

export async function createSpace(
  req: Request,
  res: Response,
): Promise<void> {
  const ownerId = req.session.userId;

  if (!ownerId) {
    res.status(401).json({
      status: "error",
      message: "Authentication required. Please log in.",
    });
    return;
  }

  const name =
    typeof req.body?.name === "string" ? req.body.name.trim() : "";

  if (!name) {
    res.status(400).json({
      status: "error",
      message: "Space name is required.",
    });
    return;
  }

  if (name.length > 100) {
    res.status(400).json({
      status: "error",
      message: "Space name cannot exceed 100 characters.",
    });
    return;
  }

  try {
    const space = await Space.create({
      name,
      ownerId,
      isDefault: false,
    });

    res.status(201).json({
      status: "success",
      message: "Space created successfully.",
      data: {
        space: {
          _id: space._id,
          name: space.name,
          isDefault: space.isDefault,
        },
      },
    });
  } catch {
    res.status(500).json({
      status: "error",
      message: "Unable to create space.",
    });
  }
}