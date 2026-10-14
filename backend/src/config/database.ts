import mongoose from "mongoose";

export async function connectDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured in the environment.");
  }

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
        await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
        });

        console.log("MongoDB connected successfully.");
        return;
    } catch (error: unknown) {
        console.error(
        `MongoDB connection attempt ${attempt}/${maxAttempts} failed.`,
        );

        if (attempt === maxAttempts) {
        throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    }

  console.log("MongoDB connected successfully.");
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}