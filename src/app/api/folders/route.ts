import { NextResponse } from "next/server";

import { parseCreateFolderBody } from "@/features/folders/folder-request";
import { folderRoute } from "@/features/folders/folder-route";

export const GET = folderRoute("api.folders.tree", async ({ service, userId }) =>
  NextResponse.json({ data: await service.getTree(userId) }),
);

export const POST = folderRoute("api.folders.create", async ({ request, service, userId }) => {
  const input = await parseCreateFolderBody(request);
  return NextResponse.json({ data: await service.create(userId, input) }, { status: 201 });
});
