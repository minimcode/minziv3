import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await params;
  const friend = await prisma.user.findUnique({ where: { username } });
  if (!friend) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const friendship = await prisma.friendship.findFirst({
    where: {
      userId: friend.id,
      friendId: session.user.id,
      status: "pending",
    },
  });

  if (!friendship) {
    return Response.json({ error: "No pending request" }, { status: 404 });
  }

  await prisma.friendship.update({
    where: { id: friendship.id },
    data: { status: "accepted" },
  });

  return Response.json({ status: "accepted" });
}
