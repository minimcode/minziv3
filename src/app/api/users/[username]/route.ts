import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      bio: true,
      createdAt: true,
      profile: {
        select: {
          level: true,
          streakCount: true,
        },
      },
      _count: {
        select: {
          characterStates: true,
          reviews: true,
          friends: { where: { status: "accepted" } },
          friendOf: { where: { status: "accepted" } },
        },
      },
    },
  });

  if (!user) {
    return Response.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const session = await auth();
  let friendshipStatus: string | null = null;

  if (session?.user?.id && session.user.id !== user.id) {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: session.user.id, friendId: user.id },
          { userId: user.id, friendId: session.user.id },
        ],
      },
    });
    if (friendship) {
      if (friendship.status === "accepted") {
        friendshipStatus = "friends";
      } else if (friendship.userId === session.user.id) {
        friendshipStatus = "request_sent";
      } else {
        friendshipStatus = "request_received";
      }
    }
  }

  const totalFriends =
    (user._count?.friends ?? 0) + (user._count?.friendOf ?? 0);

  return Response.json({
    id: user.id,
    name: user.name,
    username: user.username,
    image: user.image,
    bio: user.bio,
    createdAt: user.createdAt,
    level: user.profile?.level || "HSK1",
    streak: user.profile?.streakCount || 0,
    charsLearned: user._count?.characterStates ?? 0,
    totalReviews: user._count?.reviews ?? 0,
    friendsCount: totalFriends,
    friendshipStatus,
    isOwnProfile: session?.user?.id === user.id,
  });
}
