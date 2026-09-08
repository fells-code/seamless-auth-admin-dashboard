/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { expect, test } from "../fixtures";
import type { MockApi } from "../mockApi";
import {
  confirmDialog,
  drainRetries,
  expectErrorState,
  expectToast,
} from "../helpers";
import { makeMembership, makeOrganization } from "../factories";

/** The editor for the currently selected organization, not the create form. */
function organizationEditor(page: import("@playwright/test").Page) {
  return page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Save" }) });
}

const ACME = makeOrganization({
  id: "org_1",
  name: "Acme Corp",
  slug: "acme-corp",
  memberCount: 1,
});

/** Organizations and memberships the mutations actually change. */
function seedOrganizations(api: MockApi) {
  const organizations = [ACME];
  const members = [
    makeMembership({
      id: "membership_1",
      organizationId: "org_1",
      userId: "user_1",
      roles: ["member"],
    }),
  ];

  api.get("/admin/organizations", () => ({
    json: { organizations, total: organizations.length },
  }));

  api.post("/admin/organizations", ({ payload }) => {
    const created = makeOrganization(payload as object);
    organizations.push(created);
    return { json: { organization: created } };
  });

  api.patch("/admin/organizations/:organizationId", ({ params, payload }) => {
    const index = organizations.findIndex(
      (org) => org.id === params.organizationId,
    );
    const updated = { ...organizations[index], ...(payload as object) };
    organizations[index] = updated;
    return { json: { organization: updated } };
  });

  api.get("/admin/organizations/:organizationId/members", () => ({
    json: { members, total: members.length },
  }));

  api.post("/admin/organizations/:organizationId/members", ({ payload }) => {
    const added = makeMembership({
      id: "membership_added",
      userId: "user_added",
      ...(payload as object),
      user: {
        id: "user_added",
        email: (payload as { email: string }).email,
        phone: null,
        roles: [],
      },
    });
    members.push(added);
    return { json: { membership: added } };
  });

  api.patch(
    "/admin/organizations/:organizationId/members/:userId",
    ({ params, payload }) => {
      const index = members.findIndex(
        (member) => member.userId === params.userId,
      );
      members[index] = { ...members[index], ...(payload as object) };
      return { json: { membership: members[index] } };
    },
  );

  api.delete(
    "/admin/organizations/:organizationId/members/:userId",
    ({ params }) => {
      const index = members.findIndex(
        (member) => member.userId === params.userId,
      );
      if (index >= 0) members.splice(index, 1);
      return { json: { message: "Member removed" } };
    },
  );

  return { organizations, members };
}

test.describe("Organizations", () => {
  test("lists the seeded organizations and their details", async ({
    page,
    api,
    signInAs,
  }) => {
    seedOrganizations(api);

    await signInAs("writeAdmin", "/organizations");

    await expect(
      page.getByRole("heading", { name: "Organizations", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("Acme Corp").first()).toBeVisible();
    await expect(page.getByText("acme-corp").first()).toBeVisible();
  });

  test("creates an organization and selects it", async ({
    page,
    api,
    signInAs,
  }) => {
    seedOrganizations(api);

    await signInAs("writeAdmin", "/organizations");

    await page.getByLabel("Organization name").fill("Globex");
    await page.getByLabel("Organization slug").fill("globex");
    await page.getByRole("button", { name: "Create", exact: true }).click();

    await expectToast(page, "Organization created");
    expect(api.lastCall("POST", "/admin/organizations")?.payload).toMatchObject(
      { name: "Globex", slug: "globex" },
    );
  });

  test("refuses to create an organization with no name", async ({
    page,
    api,
    signInAs,
  }) => {
    seedOrganizations(api);

    await signInAs("writeAdmin", "/organizations");

    // The submit stays enabled, so the guard has to hold in the handler.
    await page.getByRole("button", { name: "Create", exact: true }).click();

    await expect
      .poll(() => api.recordedCalls("POST", "/admin/organizations").length)
      .toBe(0);
  });

  test("saves an edit to the selected organization", async ({
    page,
    api,
    signInAs,
  }) => {
    seedOrganizations(api);

    await signInAs("writeAdmin", "/organizations");
    await page
      .getByRole("button", { name: /Acme Corp/ })
      .first()
      .click();

    const editor = organizationEditor(page);
    await editor.getByLabel("Name").fill("Acme Corporation");
    await editor.getByRole("button", { name: "Save" }).click();

    await expectToast(page, "Organization updated");
    expect(
      api.lastCall("PATCH", "/admin/organizations/org_1")?.payload,
    ).toMatchObject({ name: "Acme Corporation" });
  });

  test("refuses to save an organization with an empty name", async ({
    page,
    api,
    signInAs,
  }) => {
    seedOrganizations(api);

    await signInAs("writeAdmin", "/organizations");
    await page
      .getByRole("button", { name: /Acme Corp/ })
      .first()
      .click();

    const editor = organizationEditor(page);
    await editor.getByLabel("Name").fill("");

    // Saving an empty name wrote it straight through, leaving the organization
    // unidentifiable in every list.
    await expect(page.getByText("A name is required.")).toBeVisible();
    await expect(editor.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  test("adds a member with a role", async ({ page, api, signInAs }) => {
    seedOrganizations(api);

    await signInAs("writeAdmin", "/organizations");
    await page
      .getByRole("button", { name: /Acme Corp/ })
      .first()
      .click();

    await page.getByLabel("Member email").fill("hopper@example.com");
    await page.getByLabel("Member roles").selectOption("user");
    await page.getByRole("button", { name: "Add", exact: true }).click();

    await expectToast(page, "Member added");
    expect(
      api.lastCall("POST", "/admin/organizations/org_1/members")?.payload,
    ).toMatchObject({ email: "hopper@example.com", roles: ["user"] });
  });

  test("removes a member behind a confirmation", async ({
    page,
    api,
    signInAs,
  }) => {
    seedOrganizations(api);

    await signInAs("writeAdmin", "/organizations");
    await page
      .getByRole("button", { name: /Acme Corp/ })
      .first()
      .click();

    await expect(page.getByText("ada@example.com")).toBeVisible();

    await page.getByRole("button", { name: /^Remove/ }).click();
    await confirmDialog(page, "Remove");

    await expectToast(page, "Member removed");
    await expect(
      page.getByRole("main").getByText("ada@example.com"),
    ).toBeHidden();
  });

  test("hides every write control from a read-only admin", async ({
    page,
    api,
    signInAs,
  }) => {
    seedOrganizations(api);

    await signInAs("readAdmin", "/organizations");

    await expect(page.getByLabel("Organization name")).toBeHidden();
    await expect(page.getByLabel("Member email")).toBeHidden();
    await expect(
      page.getByText("Read-only admin access").first(),
    ).toBeVisible();
  });

  test("renders an empty directory cleanly", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/admin/organizations", { json: { organizations: [], total: 0 } });

    await signInAs("writeAdmin", "/organizations");

    await expect(page.getByText("No organizations")).toBeVisible();
    await expect(
      page.getByText("Create an organization to start grouping users."),
    ).toBeVisible();
  });

  test("surfaces a failed load", async ({ page, api, signInAs }) => {
    api.get("/admin/organizations", {
      status: 500,
      json: { error: "organizations unavailable" },
    });

    await signInAs("writeAdmin", "/organizations");
    await drainRetries(page);

    await expectErrorState(page, "Could not load organizations");
  });
});
