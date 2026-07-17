import { NextResponse } from "next/server";

import { createRetentionPurgeService } from "@/features/retention/retention-purge-service";
import { getPurgeWorkerEnvironment } from "@/shared/lib/env";
import { withRequestLogging } from "@/shared/lib/request-logging";
import { isWebhookSecretValid, webhookSecretHeaderName } from "@/shared/lib/webhook-auth";

export const POST = withRequestLogging(
  "api.internal.retention-purge",
  async (request, { logger }) => {
    const { purgeWebhookSecret } = getPurgeWorkerEnvironment();
    const providedSecret = request.headers.get(webhookSecretHeaderName);

    if (!isWebhookSecretValid(providedSecret, purgeWebhookSecret)) {
      logger.warn("retention.purge.unauthorized");

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const result = await createRetentionPurgeService().run();

      logger.info("retention.purge.completed", {
        foldersPurged: result.foldersPurged,
        knowledgeObjectsPurged: result.knowledgeObjectsPurged,
        storageObjectsRemoved: result.storageObjectsRemoved,
      });

      return NextResponse.json({ data: result });
    } catch {
      logger.error("retention.purge.failed");

      return NextResponse.json({ error: "Retention purge failed" }, { status: 500 });
    }
  },
);
