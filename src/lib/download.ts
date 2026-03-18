export function downloadTextFile(
  fileName: string,
  content: string,
  mimeType: string,
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(fileName: string, payload: unknown) {
  downloadTextFile(
    fileName,
    JSON.stringify(payload, null, 2),
    "application/json;charset=utf-8",
  );
}

export function downloadCsv(
  fileName: string,
  rows: Array<Record<string, string | number>>,
) {
  if (!rows.length) {
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          const text = String(value ?? "");
          return `"${text.replaceAll('"', '""')}"`;
        })
        .join(","),
    ),
  ].join("\n");

  downloadTextFile(fileName, csv, "text/csv;charset=utf-8");
}
