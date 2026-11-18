export interface CsvRow {
  /** Número da linha física no ficheiro (cabeçalho = 1). */
  line: number;
  cells: string[];
}

/**
 * Leitor CSV mínimo (RFC 4180): UTF-8 com ou sem BOM, LF ou CRLF, campos entre aspas.
 * Ignora linhas completamente vazias. O 1.º registo devolvido é o cabeçalho.
 */
export function parseCsv(text: string): CsvRow[] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: CsvRow[] = [];
  let cells: string[] = [];
  let cell = '';
  let inQuotes = false;
  let line = 1;
  let startLine = 1;
  let hasContent = false;

  const endRecord = () => {
    cells.push(cell);
    if (hasContent || cells.length > 1) rows.push({ line: startLine, cells });
    cells = [];
    cell = '';
    hasContent = false;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else {
        if (ch === '\n') line++;
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      hasContent = true;
    } else if (ch === ',') {
      cells.push(cell);
      cell = '';
      hasContent = true;
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      endRecord();
      line++;
      startLine = line;
    } else {
      cell += ch;
      hasContent = true;
    }
  }
  if (hasContent || cell !== '' || cells.length > 0) endRecord();
  return rows;
}
