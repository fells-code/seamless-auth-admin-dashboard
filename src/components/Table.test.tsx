/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pencil } from "lucide-react";
import Table from "./Table";

type TestRow = {
  name: string;
  role: string;
};

const columns = [
  { key: "name", label: "Name", sortable: true },
  { key: "role", label: "Role" },
] satisfies {
  key: keyof TestRow;
  label: string;
  sortable?: boolean;
}[];

const rows: TestRow[] = [
  { name: "Charlie", role: "Viewer" },
  { name: "Alice", role: "Admin" },
];

describe("Table", () => {
  it("renders empty states", () => {
    render(
      <Table<TestRow>
        columns={columns}
        data={[]}
        emptyTitle="No users"
        emptyDescription="Create a user to populate this table."
      />,
    );

    expect(screen.getByText("No users")).toBeInTheDocument();
    expect(
      screen.getByText("Create a user to populate this table."),
    ).toBeInTheDocument();
    expect(screen.getByText("0 total rows")).toBeInTheDocument();
  });

  it("sorts rows when a sortable header is clicked", async () => {
    const user = userEvent.setup();

    render(<Table<TestRow> columns={columns} data={rows} />);

    await user.click(screen.getByRole("button", { name: /Name/i }));

    expect(
      screen.getAllByText(/Alice|Charlie/).map((cell) => cell.textContent),
    ).toEqual(["Alice", "Charlie"]);
    expect(screen.getByText("Sorted by name asc")).toBeInTheDocument();
  });

  it("invokes row actions and pagination callbacks", async () => {
    const onEdit = vi.fn();
    const onPageChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Table<TestRow>
        columns={columns}
        data={rows}
        total={40}
        limit={20}
        offset={0}
        onPageChange={onPageChange}
        actions={[
          {
            icon: Pencil,
            label: "Edit row",
            onClick: onEdit,
          },
        ]}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "Edit row" })[0]);
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(onEdit).toHaveBeenCalledWith(rows[0]);
    expect(onPageChange).toHaveBeenCalledWith(20);
  });
});
