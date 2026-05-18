import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      bio: true,
      image: true,
      createdAt: true,
      profile: {
        select: {
          level: true,
          dailyGoal: true,
          dailyMinutes: true,
          streakCount: true,
        },
      },
      _count: {
        select: {
          characterStates: true,
          reviews: true,
          friends: { where: { status: "accepted" } },
        },
      },
    },
  });

  return Response.json(user);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, username, bio, image } = body;

  if (username) {
    const existing = await prisma.user.findFirst({
      where: { username, id: { not: session.user.id } },
    });
    if (existing) {
      return Response.json(
        { error: "Этот юзернейм уже занят" },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name !== undefined && { name }),
      ...(username !== undefined && { username }),
      ...(bio !== undefined && { bio }),
      ...(image !== undefined && { image }),
    },
    select: {
      id: true,
      name: true,
      username: true,
      bio: true,
      image: true,
    },
  });

  return Response.json(updated);
}
