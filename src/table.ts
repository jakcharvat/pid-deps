type ColumnAlignment = "left" | "right" | "center";

type ValueFunction<T> = (row: T) => string | number;

interface SubcolumnConfig<T> {
  value: ValueFunction<T>;
  align?: ColumnAlignment;
  minWidth?: number;
}

interface ColumnConfigBase {
  header: string;
  align?: ColumnAlignment;
  minWidth?: number;
}

interface SimpleColumnConfig<T> extends ColumnConfigBase {
  value: ValueFunction<T>;
  subcolumns?: never; // Ensure subcolumns cannot be specified
}

interface SubcolumnsColumnConfig<T> extends ColumnConfigBase {
  value?: never; // Ensure value cannot be specified
  subcolumns: (SubcolumnConfig<T> | ValueFunction<T>)[];
  separator?: string;
}

type ColumnConfig<T> = SimpleColumnConfig<T> | SubcolumnsColumnConfig<T>;

export function table<T>(rows: T[], columns: ColumnConfig<T>[]): string {
  const getLength = (x: string | number) => {
    return [...new Intl.Segmenter().segment(`${x}`)].length;
  };

  const normalizeSubcolumn = <T>(
    subcol: SubcolumnConfig<T> | ValueFunction<T>,
  ): SubcolumnConfig<T> => {
    if (typeof subcol === "function") {
      return { value: subcol };
    }
    return subcol;
  };

  // Check if a subcolumn contains only empty strings
  const isEmptySubcolumn = <T>(
    rows: T[],
    subcol: SubcolumnConfig<T> | ValueFunction<T>,
  ): boolean => {
    const normalized = normalizeSubcolumn(subcol);
    return rows.every((row) => String(normalized.value(row)).trim() === "");
  };

  // Filter out empty subcolumns
  const filterEmptySubcolumns = <T>(
    rows: T[],
    subcolumns: (SubcolumnConfig<T> | ValueFunction<T>)[],
  ): (SubcolumnConfig<T> | ValueFunction<T>)[] => {
    return subcolumns.filter((subcol) => !isEmptySubcolumn(rows, subcol));
  };

  // Calculate widths for each subcolumn
  const getSubcolumnWidths = <T>(
    rows: T[],
    subcolumns: (SubcolumnConfig<T> | ValueFunction<T>)[],
  ): number[] => {
    return subcolumns.map((subcol) => {
      const normalized = normalizeSubcolumn(subcol);
      const valueWidths = rows.map((row) => {
        const value = normalized.value(row);
        return getLength(String(value));
      });
      return Math.max(...valueWidths, normalized.minWidth ?? 0);
    });
  };

  const widths = columns.map((col) => {
    if (!col.subcolumns) {
      const headerWidth = getLength(col.header);
      const valueWidths = rows.map((row) => getLength(col.value(row)));
      return Math.max(headerWidth, ...valueWidths, col.minWidth ?? 0);
    }

    const nonEmptySubcolumns = filterEmptySubcolumns(rows, col.subcolumns);
    if (nonEmptySubcolumns.length === 0) return getLength(col.header);

    // For columns with subcolumns, calculate total width based on non-empty subcolumns
    const subcolumnWidths = getSubcolumnWidths(rows, nonEmptySubcolumns);
    const totalWidth = subcolumnWidths.reduce((a, b) => a + b, 0);
    const separatorsWidth = (nonEmptySubcolumns.length - 1) * getLength(col.separator ?? " ");

    return Math.max(getLength(col.header), totalWidth + separatorsWidth, col.minWidth ?? 0);
  });

  const padCell = (text: string, width: number, align: ColumnAlignment): string => {
    const padding = width - getLength(text);
    if (padding <= 0) return text;

    switch (align) {
      case "right":
        return " ".repeat(padding) + text;
      case "center": {
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        return " ".repeat(leftPad) + text + " ".repeat(rightPad);
      }
      default: // left
        return text + " ".repeat(padding);
    }
  };

  const header = columns
    .map((col, i) => padCell(col.header, widths[i], col.align ?? "left"))
    .join(" │ ");

  const separator = widths.map((w) => "─".repeat(w)).join("─┼─");

  const data = rows.map((row) =>
    columns
      .map((col, i) => {
        if (!col.subcolumns) {
          const value = String(col.value(row));
          const defaultAlign = typeof col.value(row) === "number" ? "right" : "left";
          return padCell(value, widths[i], col.align ?? defaultAlign);
        }

        const nonEmptySubcolumns = filterEmptySubcolumns(rows, col.subcolumns);
        if (nonEmptySubcolumns.length === 0) return " ".repeat(widths[i]);

        const subcolumnWidths = getSubcolumnWidths(rows, nonEmptySubcolumns);
        const subcolumnValues = nonEmptySubcolumns.map((subcol, subcolIdx) => {
          const normalized = normalizeSubcolumn(subcol);
          const value = String(normalized.value(row));
          const defaultAlign = typeof normalized.value(row) === "number" ? "right" : "left";
          return padCell(value, subcolumnWidths[subcolIdx], normalized.align ?? defaultAlign);
        });

        const combined = subcolumnValues.join(col.separator ?? " ");
        return padCell(combined, widths[i], "left");
      })
      .join(" │ "),
  );

  return [header, separator, ...data].join("\n");
}
