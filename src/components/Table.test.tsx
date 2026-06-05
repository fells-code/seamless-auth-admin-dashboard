/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, within } from "@testing-library/react";
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

  it("keeps column headers and rows in the same horizontal scroll region", () => {
    render(<Table<TestRow> columns={columns} data={rows} />);

    const region = screen.getByRole("region", { name: "Table content" });
    const headerGrid = within(region)
      .getByRole("button", { name: /Name/i })
      .closest(".grid") as HTMLElement;
    const rowGrid = within(region)
      .getByText("Charlie")
      .closest(".grid") as HTMLElement;

    expect(region).toContainElement(rowGrid);
    expect(headerGrid.parentElement).toContainElement(rowGrid);
    expect(headerGrid.style.gridTemplateColumns).toBe(
      rowGrid.style.gridTemplateColumns,
    );
    expect(headerGrid.parentElement).toHaveStyle({ minWidth: "332px" });
  });

  it("supports compact column widths, wrapped cells, and sticky actions", () => {
    render(
      <Table<TestRow>
        columns={[
          { key: "name", label: "Name", width: "wide", wrap: true },
          { key: "role", label: "Role", width: "compact", align: "right" },
        ]}
        data={rows}
        actions={[
          {
            icon: Pencil,
            label: "Edit row",
            onClick: vi.fn(),
          },
        ]}
      />,
    );

    const region = screen.getByRole("region", { name: "Table content" });
    const headerGrid = within(region)
      .getByRole("button", { name: "Name" })
      .closest(".grid") as HTMLElement;
    const wrappedCell = within(region).getByText("Charlie").closest("div");
    const alignedCell = within(region).getByText("Viewer").closest("div");
    const headerActions = within(region).getByText("Actions");
    const rowAction = within(region)
      .getAllByRole("button", { name: "Edit row" })[0]
      .closest("div");

    expect(headerGrid.style.gridTemplateColumns).toBe(
      "minmax(220px, 1.35fr) minmax(72px, 0.35fr) 64px",
    );
    expect(headerGrid.parentElement).toHaveStyle({ minWidth: "412px" });
    expect(wrappedCell).toHaveClass("whitespace-normal");
    expect(alignedCell).toHaveClass("text-right");
    expect(headerActions).toHaveClass("sticky", "right-0");
    expect(rowAction).toHaveClass("sticky", "right-0");
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
