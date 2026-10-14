import type { Request, Response } from "express";

export function logoutController(
  req: Request,
  res: Response,
): void {
  req.session.destroy((error) => {
    if (error) {
      console.error("Logout failed:", error);

      res.status(500).json({
        status: "error",
        message: "Unable to log out right now.",
      });
      return;
    }

    res.clearCookie("productivity.sid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    res.status(200).json({
      status: "success",
      message: "Logged out successfully.",
    });
  });
}