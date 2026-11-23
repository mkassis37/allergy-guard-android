export type LabPdfCandidate = {
  id: string;
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  sourceLine: string;
  confidence: "high" | "review";
  warnings: string[];
};

const ARABIC_DIGITS: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "٫": ".", "٬": ",", "−": "-", "–": "-", "—": "-",
};

export function normalizeLabText(input: string): string {
  return input
    .replace(/[٠-٩٫٬−–—]/g, (character) => ARABIC_DIGITS[character] ?? character)
    .replace(/\u00a0/g, " ")
    .replace(/[\t ]+/g, " ")
    .trim();
}

const VALUE_PATTERN = /(?:^|\s)([<>≤≥]?\s*-?\d+(?:[.,]\d+)?(?:\s*[-–]\s*-?\d+(?:[.,]\d+)?)?)(?=\s|$)/;

function looksLikeHeader(line: string): boolean {
  return /\b(patient|name|date|result|unit|reference|range|normal|laboratory|test)\b|اسم|المريض|التاريخ|النتيجة|الوحدة|المجال|المختبر|الفحص/i.test(line);
}

function makeId(line: string, index: number): string {
  let hash = 2166136261;
  for (const character of line) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `lab-import-${index}-${(hash >>> 0).toString(36)}`;
}

/**
 * Conservative line parser for text already extracted from a laboratory PDF.
 * It deliberately returns candidates for human review; it does not interpret
 * whether a result is medically normal or abnormal.
 */
export function parseLabTextCandidates(input: string): LabPdfCandidate[] {
  const lines = input
    .split(/\r?\n/)
    .map(normalizeLabText)
    .filter((line) => line.length > 0);
  const output: LabPdfCandidate[] = [];

  lines.forEach((line, index) => {
    if (line.length > 240 || looksLikeHeader(line)) return;
    const match = line.match(VALUE_PATTERN);
    if (!match || match.index === undefined) return;

    const value = match[1].replace(/\s+/g, "");
    const before = line.slice(0, match.index).trim();
    const after = line.slice(match.index + match[0].length).trim();
    const testName = before.replace(/[|:;]+$/g, "").trim();
    if (testName.length < 2 || testName.length > 90) return;
    if (/^\d+$/.test(testName) || /^(?:page|صفحة)\s*\d*$/i.test(testName)) return;

    const tokens = after.split(" ").filter(Boolean);
    const referenceRangeMatch = after.match(/(?:^|\s)(?:\d+(?:[.,]\d+)?\s*[-–]\s*\d+(?:[.,]\d+)?|<\s*\d+(?:[.,]\d+)?|>\s*\d+(?:[.,]\d+)?)(?:\s|$)/);
    const referenceRange = referenceRangeMatch?.[0]?.trim() ?? "";
    const unit = tokens.find((token) =>
      /[a-zA-Zµμ%/]/.test(token) && !/^(H|L|HIGH|LOW|NORMAL|NEGATIVE|POSITIVE)$/i.test(token),
    ) ?? "";

    const warnings: string[] = [];
    if (!unit) warnings.push("لم تُكتشف وحدة القياس بوضوح.");
    if (!referenceRange) warnings.push("لم يُكتشف المجال المرجعي؛ راجع التقرير الأصلي.");
    if (/[<>≤≥]/.test(value)) warnings.push("النتيجة حدّية أو مقارنة؛ تأكد من نقل الرمز كما هو.");
    if (/[.,]\d{3,}$/.test(value)) warnings.push("تحقق من الفاصلة العشرية وطريقة كتابة الرقم.");

    const confidence = unit && referenceRange && warnings.length === 0 ? "high" : "review";
    output.push({
      id: makeId(line, index),
      testName,
      value,
      unit,
      referenceRange,
      sourceLine: line,
      confidence,
      warnings,
    });
  });

  return output;
}
