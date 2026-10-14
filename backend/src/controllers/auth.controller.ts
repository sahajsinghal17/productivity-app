import type { Request, Response } from "express";
import { login, signup } from "../services/auth.service.js";

export async function signupController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { name, email, password } = req.body ?? {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      res.status(400).json({
        status: "error",
        message: "Name, email, and password are required.",
      });
      return;
    }

    const user = await signup({ name, email, password });

    res.status(201).json({
      status: "success",
      message: "Account created successfully.",
      data: { user },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    if (
      message === "An account with this email or identity already exists."
    ) {
      res.status(409).json({
        status: "error",
        message,
      });
      return;
    }

    if (
      message === "Name must be between 1 and 100 characters." ||
      message === "Please provide a valid email address." ||
      message === "Password must be between 8 and 72 characters."
    ) {
      res.status(400).json({
        status: "error",
        message,
      });
      return;
    }

    console.error("Signup failed:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to create your account right now.",
    });
  }
}

export async function loginController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { email, password } = req.body ?? {};

    if (typeof email !== "string" || typeof password !== "string") {
      res.status(400).json({
        status: "error",
        message: "Email and password are required.",
      });
      return;
    }

    const user = await login({ email, password });
    await new Promise<void>((resolve, reject) => {
        req.session.regenerate((error) => {
            if (error) {
            reject(error);
            return;
            }

            resolve();
        });
    });

    req.session.userId = user.id;

    await new Promise<void>((resolve, reject) => {
    req.session.save((error) => {
        if (error) {
        reject(error);
        return;
        }

        resolve();
    });
    });

    res.status(200).json({
    status: "success",
    message: "Login successful.",
    data: { user },
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === "Invalid email or password."
    ) {
      res.status(401).json({
        status: "error",
        message: "Invalid email or password.",
      });
      return;
    }

    console.error("Login failed:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to log in right now.",
    });
  }
}