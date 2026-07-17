import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const payload = await getAuthenticatedUser(req);
    if (!payload) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }

    const username = payload.username;

    // Fetch all active items, their comments, and the user's comment reads
    const items = await prisma.item.findMany({
      where: { is_archived: false },
      include: {
        comments: {
          orderBy: { created_at: "desc" },
        },
        comment_reads: {
          where: { username },
        },
      },
    });

    const notificationsList: any[] = [];
    let totalUnread = 0;

    for (const item of items) {
      const comments = item.comments;
      if (comments.length === 0) continue;

      const commentRead = item.comment_reads[0];
      const lastSeenAt = commentRead ? new Date(commentRead.last_seen_at) : new Date(0);

      const unreadComments = comments.filter((c) => new Date(c.created_at) > lastSeenAt);
      const unreadCount = unreadComments.length;

      if (unreadCount > 0) {
        totalUnread += unreadCount;
        const latestComment = comments[0];

        notificationsList.push({
          item_id: item.catalogue_num,
          item_type_id: item.item_type_id,
          item_name: item.item_name,
          catalogue_num: item.catalogue_num,
          brand: item.brand,
          unread_count: unreadCount,
          latest_comment: latestComment.comment,
          latest_comment_at: latestComment.created_at,
          latest_comment_by: latestComment.username,
        });
      }
    }

    return NextResponse.json({
      total_unread: totalUnread,
      items: notificationsList,
      item_types: [], // Matches Python return structure
    });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
