import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return Response.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: session.user.id } },
        {
          OR: [
            { username: { contains: q } },
            { name: { contains: q } },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      profile: { select: { level: true } },
    },
    take: 5,
  });

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { userId: session.user.id, friendId: { in: users.map((u) => u.id) } },
        { friendId: session.user.id, userId: { in: users.map((u) => u.id) } },
      ],
    },
  });

  const results = users.map((u) => {
    const fs = friendships.find(
      (f) =>
        (f.userId === session.user!.id && f.friendId === u.id) ||
        (f.friendId === session.user!.id && f.userId === u.id)
    );
    let friendStatus: string | null = null;
    if (fs) {
      if (fs.status === "accepted") friendStatus = "friends";
      else if (fs.userId === session.user!.id) friendStatus = "request_sent";
      else friendStatus = "request_received";
    }
    return {
      ...u,
      level: u.profile?.level || "HSK1",
      friendStatus,
    };
  });

  return Response.json({ users: results });
}
