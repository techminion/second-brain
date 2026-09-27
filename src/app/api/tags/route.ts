import { NextResponse } from "next/server";

import { searchRoute } from "@/features/search/search-route";

export const GET = searchRoute("api.tags.list", async ({ service, userId }) =>
  NextResponse.json({ data: await service.listTags(userId) }),
);
