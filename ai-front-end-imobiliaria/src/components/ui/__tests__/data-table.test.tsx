import { fireEvent, render, screen } from "@testing-library/react";
import type { ColumnDef } from "@tanstack/react-table";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "../data-table";

const navigation = vi.hoisted(() => ({
  pathname: "/usuarios",
  push: vi.fn(),
  searchParams: new URLSearchParams("page=2&filterName=Ana"),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => navigation.searchParams,
}));

interface Row {
  id: number;
  name: string;
}

const columns: ColumnDef<Row>[] = [
  { accessorKey: "id", header: "Código" },
  { accessorKey: "name", header: "Nome" },
];

describe("DataTable", () => {
  beforeEach(() => {
    navigation.push.mockReset();
    navigation.searchParams = new URLSearchParams("page=2&filterName=Ana");
  });

  it("renders rows and reuses URL pagination while preserving filters", () => {
    render(
      <DataTable
        columns={columns}
        data={[{ id: 1, name: "Ana" }]}
        emptyMessage="Nenhum registro encontrado."
        pageCount={3}
      />,
    );

    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Mostrando página 2 de 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));

    expect(navigation.push).toHaveBeenCalledWith("/usuarios?page=3&filterName=Ana");
  });

  it("renders the domain empty state", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        emptyMessage="Nenhum registro encontrado."
        pageCount={1}
      />,
    );

    expect(screen.getByText("Nenhum registro encontrado.")).toBeInTheDocument();
  });
});
