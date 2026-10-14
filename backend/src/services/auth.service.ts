import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";
import Space from "../models/Space.js";

interface SignupInput {
  name: string;
  email: string;
  password: string;
}

export async function signup(input: SignupInput) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!name || name.length > 100) {
    throw new Error("Name must be between 1 and 100 characters.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please provide a valid email address.");
  }

  if (password.length < 8 || password.length > 72) {
    throw new Error("Password must be between 8 and 72 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const session = await mongoose.startSession();

  try {
    let createdUserId: mongoose.Types.ObjectId | undefined;

    await session.withTransaction(async () => {
      const [user] = await User.create(
        [{ name, email, passwordHash }],
        { session },
      );

      const [space] = await Space.create(
        [
          {
            name: "Personal",
            ownerId: user._id,
            isDefault: true,
          },
        ],
        { session },
      );

      if (!space) {
        throw new Error("Failed to create the default Personal space.");
      }

      createdUserId = user._id;
    });

    if (!createdUserId) {
      throw new Error("Signup could not be completed.");
    }

    return {
      id: createdUserId.toString(),
      name,
      email,
    };
  } catch (error: unknown) {
    if (
      error instanceof mongoose.mongo.MongoServerError &&
      error.code === 11000
    ) {
      throw new Error("An account with this email or identity already exists.");
    }

    throw error;
  } finally {
    await session.endSession();
  }
}

export async function login(input: {
  email: string;
  password: string;
}) {
  const email = input.email.trim().toLowerCase();

  if (!email || !input.password) {
    throw new Error("Email and password are required.");
  }

  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user || !user.passwordHash) {
    throw new Error("Invalid email or password.");
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new Error("Invalid email or password.");
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
  };
}
