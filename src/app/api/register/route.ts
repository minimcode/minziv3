import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password, name, username } = await req.json();

    if (!email || !password) {
      return Response.json(
        { error: "Email и пароль обязательны" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return Response.json(
        { error: "Пароль должен быть не менее 6 символов" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return Response.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 409 }
      );
    }

    if (username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username },
      });
      if (existingUsername) {
        return Response.json(
          { error: "Этот юзернейм уже занят" },
          { status: 409 }
        );
      }
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name: name || null,
        username: username || null,
        emailVerified: new Date(),
      },
    });

    await prisma.userProfile.create({
      data: { userId: user.id },
    });

    return Response.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 }
    );
  } catch (e) {
    console.error("Registration error:", e);
    return Response.json(
      { error: "Ошибка при регистрации" },
      { status: 500 }
    );
  }
}
