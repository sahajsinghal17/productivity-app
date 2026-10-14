
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
