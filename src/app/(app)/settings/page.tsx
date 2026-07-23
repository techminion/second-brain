import { UpdateProfileForm } from "@/features/user/components/update-profile-form";
import { createUserService } from "@/features/user/user-service";
import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

export const metadata = { title: "Account settings" };

export default async function SettingsPage() {
  const client = await createServerActionSupabaseClient();
  const { data } = await client.auth.getClaims();
  const userId = data?.claims.sub;

  if (typeof userId !== "string") {
    return null;
  }

  const service = await createUserService();
  const profile = await service.getProfile(userId);

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <h1 className="mb-8 text-2xl font-semibold">Account settings</h1>
      <section aria-labelledby="profile-heading" className="flex flex-col gap-6">
        <h2 className="text-lg font-medium" id="profile-heading">
          Profile
        </h2>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Email</span>
          <span className="text-muted-foreground text-sm">{profile.email}</span>
        </div>
        <UpdateProfileForm initialDisplayName={profile.displayName} />
      </section>
    </div>
  );
}
