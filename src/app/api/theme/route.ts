import { NextResponse } from "next/server";

import { isProductionEnvironment } from "@/shared/lib/env";
import { isThemePreference, themeCookieName } from "@/shared/lib/theme";

interface ThemeRequestBody {
  preference?: unknown;
}

export async function POST(request: Request) {
  const body: ThemeRequestBody = await request.json().catch(() => ({}));

  if (typeof body.preference !== "string" || !isThemePreference(body.preference)) {
    return NextResponse.json({ error: "Invalid theme preference." }, { status: 400 });
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(themeCookieName, body.preference, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: isProductionEnvironment,
  });

  return response;
}
