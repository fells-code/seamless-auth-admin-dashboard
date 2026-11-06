/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { expect, test } from "../fixtures";
import type { MockApi } from "../mockApi";
import { confirmDialog, expectInlineAlert, expectToast } from "../helpers";
import {
  makeMembership,
  makeMeUser,
  makeOrganization,
  makePermission,
  makeRoleDefinition,
  makeStepUpStatus,
} from "../factories";

function seedModel(api: MockApi) {
  const permissions = [
    makePermission({ name: "invoices:read", description: "Read invoices" }),
    makePermission({ name: "reports:read" }),
  ];
  const roles = [
    makeRoleDefinition({ name: "admin", kind: "instance" }),
    makeRoleDefinition({
      name: "admin",
      builtIn: true,
      permissions: ["invoices:read"],
    }),
    makeRoleDefinition({ name: "Legacy Role" }),
  ];

  api.get("/admin/permissions", () => ({
    json: { permissions, total: permissions.length },
  }));
  api.get("/admin/roles", () => ({ json: { roles } }));

  api.post("/admin/permissions", ({ payload }) => {
    const permission = makePermission(payload as object);
    permissions.push(permission);
    return { status: 201, json: { permission } };
  });

  api.delete("/admin/permissions/:permissionName", ({ params }) => ({
    status: 409,
    json: {
      error: "Permission is still granted by a role",
      details: {
        roles: roles
          .filter((role) => role.permissions.includes(params.permissionName))
          .map(({ kind, name }) => ({ kind, name })),
      },
    },
  }));

  api.put("/admin/roles/:kind/:roleName/permissions", ({ params, payload }) => {
    const role = roles.find(
      (candidate) =>
        candidate.kind === params.kind && candidate.name === params.roleName,
    )!;
    role.permissions = (payload as { permissions: string[] }).permissions;
    return { json: { role } };
  });

  api.post("/admin/organization-roles", ({ payload }) => {
    const role = makeRoleDefinition(payload as object);
    roles.push(role);
    return { status: 201, json: { role } };
  });

  api.delete("/admin/organization-roles/:roleName", () => ({
    status: 409,
    json: {
      error: "Organization role is still held",
      details: { holders: 2 },
    },
  }));

  return { permissions, roles };
}

test.describe("Roles", () => {
  test("lists the model and says how it behaves", async ({
    page,
    api,
    signInAs,
  }) => {
    seedModel(api);

    await signInAs("writeAdmin", "/roles");

    await expect(
      page.getByRole("heading", { name: "Roles and permissions", level: 1 }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("table", { name: "Permissions" })
        .getByText("Read invoices"),
    ).toBeVisible();
    await expect(
      page
        .getByRole("table", { name: "Organization roles" })
        .getByText("Built in"),
    ).toBeVisible();
    await expect(page.getByText(/next access token is issued/)).toBeVisible();
    await expect(page.getByText(/never share a grant/)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Add or remove in System" }),
    ).toHaveAttribute("href", "/system");
  });

  test("creates a permission", async ({ page, api, signInAs }) => {
    seedModel(api);

    await signInAs("writeAdmin", "/roles");
    await page.getByRole("button", { name: "New permission" }).click();

    const form = page.getByRole("dialog");
    await form.getByLabel("Name").fill("projects:write");
    await form.getByRole("button", { name: "Create permission" }).click();

    await expectToast(page, "Permission created");
    expect(api.lastCall("POST", "/admin/permissions")?.payload).toEqual({
      name: "projects:write",
    });
    await expect(
      page
        .getByRole("table", { name: "Permissions" })
        .getByText("projects:write"),
    ).toBeVisible();
  });

  test("replaces a mapping on a role with a space in its name", async ({
    page,
    api,
    signInAs,
  }) => {
    seedModel(api);

    await signInAs("writeAdmin", "/roles");
    await page
      .getByRole("button", { name: "Edit permissions Legacy Role" })
      .click();

    const form = page.getByRole("dialog");
    await form.getByRole("button", { name: "reports:read" }).click();
    await form.getByRole("button", { name: "Save" }).click();

    await expectToast(page, "Role permissions saved");
    expect(
      api.lastCall("PUT", "/admin/roles/organization/Legacy%20Role/permissions")
        ?.payload,
    ).toEqual({ permissions: ["reports:read"] });
  });

  test("shows the roles behind a refused permission delete", async ({
    page,
    api,
    signInAs,
  }) => {
    seedModel(api);

    await signInAs("writeAdmin", "/roles");
    await page.getByRole("button", { name: "Delete invoices:read" }).click();
    await confirmDialog(page, "Delete");

    await expectInlineAlert(
      page,
      /still granted by a role: organization role admin/,
    );
  });

  test("shows the holder count on a refused role delete", async ({
    page,
    api,
    signInAs,
  }) => {
    seedModel(api);

    await signInAs("writeAdmin", "/roles");
    await page.getByRole("button", { name: "Delete Legacy Role" }).click();
    await confirmDialog(page, "Delete");

    await expectInlineAlert(page, /2 memberships hold it/);
  });

  test("shows a mapping refused by the API in the dialog", async ({
    page,
    api,
    signInAs,
  }) => {
    seedModel(api);
    api.put("/admin/roles/:kind/:roleName/permissions", {
      status: 400,
      json: {
        error: "Unknown permissions",
        details: { permissions: ["reports:read"] },
      },
    });

    await signInAs("writeAdmin", "/roles");
    await page
      .getByRole("button", { name: "Edit permissions Legacy Role" })
      .click();

    const form = page.getByRole("dialog");
    await form.getByRole("button", { name: "reports:read" }).click();
    await form.getByRole("button", { name: "Save" }).click();

    await expect(
      form.getByText(/Unknown permissions: reports:read/),
    ).toBeVisible();
  });

  test("writes nothing when step-up fails", async ({ page, api }) => {
    seedModel(api);
    api.get("/users/me", {
      json: {
        user: makeMeUser({ roles: ["admin:write"] }),
        credentials: [],
        organizations: [],
        activeOrganization: null,
      },
    });
    api.get("/step-up/status", { json: makeStepUpStatus({ fresh: false }) });

    await page.goto("/roles");
    await page.getByRole("button", { name: "New permission" }).click();

    const form = page.getByRole("dialog");
    await form.getByLabel("Name").fill("projects:write");
    await form.getByRole("button", { name: "Create permission" }).click();

    await expectToast(page, /security key or authenticator is required/i);
    expect(api.recordedCalls("POST", "/admin/permissions")).toHaveLength(0);
    await expect(form).toBeVisible();
  });

  test("hides writes from a read-only admin", async ({
    page,
    api,
    signInAs,
  }) => {
    seedModel(api);

    await signInAs("readAdmin", "/roles");

    await expect(page.getByText("Read-only access")).toBeVisible();
    await expect(
      page.getByRole("table", { name: "Permissions" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^New / })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Delete / })).toHaveCount(0);
  });

  test("says the API needs upgrading when the routes are missing, once", async ({
    page,
    api,
    signInAs,
  }) => {
    api.get("/admin/permissions", {
      status: 404,
      json: { error: "Not found" },
    });
    api.get("/admin/roles", { status: 404, json: { error: "Not found" } });

    await signInAs("writeAdmin", "/roles");

    await expect(page.getByText("Needs Seamless Auth API v0.23")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(0);
    await page.clock.runFor(30_000);
    expect(api.recordedCalls("GET", "/admin/roles").length).toBeLessThanOrEqual(
      1,
    );
  });
});

test.describe("Organization member roles", () => {
  function seedMember(api: MockApi, roles: string[]) {
    api.get("/admin/organizations", {
      json: {
        organizations: [makeOrganization({ id: "org_1", name: "Acme Corp" })],
        total: 1,
      },
    });
    api.get("/admin/organizations/:organizationId/members", {
      json: {
        members: [
          makeMembership({ userId: "user_1", organizationId: "org_1", roles }),
        ],
        total: 1,
      },
    });
    api.get("/admin/roles", {
      json: {
        roles: [
          makeRoleDefinition({ name: "reports", kind: "instance" }),
          makeRoleDefinition({ name: "member", builtIn: true }),
          makeRoleDefinition({ name: "owner", builtIn: true }),
        ],
      },
    });
  }

  test("offers the catalogue and keeps a legacy role", async ({
    page,
    api,
    signInAs,
  }) => {
    seedMember(api, ["member", "Legacy Role"]);
    api.patch(
      "/admin/organizations/:organizationId/members/:userId",
      ({ payload }) => ({
        json: { membership: makeMembership(payload as object) },
      }),
    );

    await signInAs("writeAdmin", "/organizations");

    await expect(page.getByLabel("Member roles").locator("option")).toHaveText([
      "member",
      "owner",
    ]);

    await page
      .getByRole("button", { name: "Edit roles ada@example.com" })
      .click();
    const form = page.getByRole("dialog");
    await expect(
      form.getByRole("button", { name: "Legacy Role" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      form.getByText(/Not in the catalogue: Legacy Role/),
    ).toBeVisible();

    await form.getByRole("button", { name: "Save" }).click();

    await expectToast(page, "Membership updated");
    expect(
      api.lastCall("PATCH", "/admin/organizations/org_1/members/user_1")
        ?.payload,
    ).toMatchObject({ roles: ["member", "Legacy Role"] });
  });

  test("names the roles in a 403 refusal", async ({ page, api, signInAs }) => {
    seedMember(api, ["member"]);
    api.patch("/admin/organizations/:organizationId/members/:userId", {
      status: 403,
      json: {
        error: "Not allowed to change these roles",
        details: { roles: ["owner"] },
      },
    });

    await signInAs("writeAdmin", "/organizations");
    await page
      .getByRole("button", { name: "Edit roles ada@example.com" })
      .click();

    const form = page.getByRole("dialog");
    await form.getByRole("button", { name: "owner" }).click();
    await form.getByRole("button", { name: "Save" }).click();

    await expect(
      form.getByText(/You may not change these roles: owner/),
    ).toBeVisible();
  });
});
