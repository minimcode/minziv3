import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const friends = await prisma.friendship.findMany({
    where: {
      OR: [
        { userId: session.user.id, status: "accepted" },
        { friendId: session.user.id, status: "accepted" },
      ],
    },
    include: {
      user: { select: { id: true, name: true, username: true, image: true } },
      friend: { select: { id: true, name: true, username: true, image: true } },
    },
  });

  const pending = await prisma.friendship.findMany({
    where: { friendId: session.user.id, status: "pending" },
    include: {
      user: { select: { id: true, name: true, username: true, image: true } },
    },
  });

  const outgoing = await prisma.friendship.findMany({
    where: { userId: session.user.id, status: "pending" },
    include: {
      friend: { select: { id: true, name: true, username: true, image: true } },
    },
  });

  const friendList = friends.map((f) =>
    f.userId === session.user!.id ? f.friend : f.user
  );

  return Response.json({ friends: friendList, pending, outgoing });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await req.json();
  if (!username) {
    return Response.json({ error: "Укажите юзернейм" }, { status: 400 });
  }

  const friend = await prisma.user.findUnique({ where: { username } });
  if (!friend) {
    return Response.json(
      { error: "Пользователь не найден" },
      { status: 404 }
    );
  }

  if (friend.id === session.user.id) {
    return Response.json(
      { error: "Нельзя добавить себя" },
      { status: 400 }
    );
  }

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId: session.user.id, friendId: friend.id },
        { userId: friend.id, friendId: session.user.id },
      ],
    },
  });

  if (existing) {
    return Response.json(
      { error: "Запрос уже отправлен" },
      { status: 409 }
    );
  }

  const friendship = await prisma.friendship.create({
    data: { userId: session.user.id, friendId: friend.id },
  });

  return Response.json({
    ...friendship,
    friendPreview: {
      id: friend.id,
      name: friend.name,
      username: friend.username,
      image: friend.image,
    },
  }, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { friendshipId, action } = await req.json();

  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId },
  });

  if (!friendship || friendship.friendId !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "accept") {
    await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: "accepted" },
    });
    return Response.json({ status: "accepted" });
  }

  if (action === "reject") {
    await prisma.friendship.delete({ where: { id: friendshipId } });
    return Response.json({ status: "rejected" });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
