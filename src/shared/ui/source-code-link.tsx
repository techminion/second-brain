import { getDeployedCommitSha } from "@/shared/lib/env";

export const sourceRepositoryUrl = "https://github.com/techminion/second-brain";

/**
 * AGPL-3.0 §13: users interacting with the app over a network must be offered
 * its source. Links to the exact deployed commit when the build knows it
 * (Vercel sets VERCEL_GIT_COMMIT_SHA), otherwise to the repository.
 */
export function sourceCodeUrl(commitSha = getDeployedCommitSha()): string {
  return commitSha && /^[0-9a-f]{7,40}$/i.test(commitSha)
    ? `${sourceRepositoryUrl}/tree/${commitSha}`
    : sourceRepositoryUrl;
}

export function SourceCodeLink({ commitSha }: Readonly<{ commitSha?: string }>) {
  return (
    <a
      aria-label="Source code on GitHub (AGPL-3.0, opens in a new tab)"
      className="text-sm underline underline-offset-4"
      href={sourceCodeUrl(commitSha)}
      rel="noopener noreferrer"
      target="_blank"
    >
      Source code (AGPL-3.0)
    </a>
  );
}
