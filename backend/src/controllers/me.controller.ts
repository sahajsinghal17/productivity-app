import type { Request, Response } from "express";
import User from "../models/User.js";

export async function getCurrentUser(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const userId = req.session.userId;

    if (!userId) {
      res.status(401).json({
        status: "error",
        message: "You are not authenticated.",
      });
      return;
    }

    const user = await User.findById(userId).select("_id name email");

    if (!user) {
      req.session.destroy(() => undefined);

      res.status(401).json({
        status: "error",
        message: "Your session is no longer valid. Please log in again.",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Failed to retrieve current user:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to retrieve your account right now.",
    });
  }
}