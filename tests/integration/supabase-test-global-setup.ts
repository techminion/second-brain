import type { TestProject } from "vitest/node";

import {
  createCloudIntegrationTestProvisioner,
  type ProvidedIntegrationTestUser,
} from "./supabase-test-harness";

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const provisioner = createCloudIntegrationTestProvisioner();
  const users: ProvidedIntegrationTestUser[] = [];

  try {
    users.push(await provisioner.createUser());
    users.push(await provisioner.createUser());
  } catch (error) {
    await provisioner.deleteUsers(users);
    throw error;
  }

  project.provide("supabaseTestUsers", users);

  return async () => {
    await provisioner.deleteUsers(users);
  };
}
