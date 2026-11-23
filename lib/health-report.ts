import type { Patient } from "./allergy-store";

const esc = (value: unknown): string => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function section(title: string, headers: string[], rows: unknown[][]): string {
  const body = rows.length
    ? rows.map((row) => "<tr>" + row.map((cell) => "<td>" + esc(cell) + "</td>").join("") + "</tr>").join("")
    : '<tr><td colspan="' + headers.length + '">لا توجد سجلات</td></tr>';
  return "<h2>" + esc(title) + "</h2><table><thead><tr>" +
    headers.map((header) => "<th>" + esc(header) + "</th>").join("") +
    "</tr></thead><tbody>" + body + "</tbody></table>";
}

/** Builds a complete, printable patient report. Values are reproduced, never medically interpreted. */
export function buildPatientHealthReportHtml(patient: Patient): string {
  const profile = [
    ["الاسم", patient.fullName], ["تاريخ الميلاد", patient.birthDate],
    ["الهاتف", patient.phone], ["فصيلة الدم", patient.bloodType],
    ["جهة اتصال الطوارئ", patient.emergencyContact], ["الطبيب", patient.doctor],
  ];
  const records = patient.records.map((r) => [r.kind, r.name, r.activeIngredient, r.dosage, r.frequency, r.severity, r.eventDate || r.date, r.notes]);
  const medications = patient.medications.map((m) => [m.name, m.activeIngredient, m.prescribedDose, m.status, m.startDate, m.endDate, m.notes]);
  const conditions = patient.conditions.map((c) => [c.name, c.status, c.diagnosedAt, c.clinician, c.notes]);
  const measurements = patient.measurements.map((m) => [m.type, m.value, m.unit, m.measuredAt, m.referenceRange, m.notes]);
  const labs = patient.labResults.map((l) => [l.testName, l.value, l.unit, l.referenceRange, l.laboratory, l.collectedAt, l.resultedAt, l.notes, l.attachmentUris.length]);
  const appointments = patient.appointments.map((a) => [a.title, a.type, a.clinicianOrFacility, a.startsAt, a.status, a.notes, a.attachmentUris.length]);
  const doses = patient.doseEvents.map((d) => [d.medicationId, d.scheduledAt, d.status, d.recordedAt, d.notes]);
  return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
    'body{font-family:Arial,Tahoma,sans-serif;color:#17324d;padding:22px}h1{font-size:24px}h2{font-size:17px;margin-top:24px;color:#087e8b}table{width:100%;border-collapse:collapse;font-size:10px;margin-top:8px}th,td{border:1px solid #d9e2ec;padding:7px;text-align:right;vertical-align:top}th{background:#eaf5f6}td{overflow-wrap:anywhere}.note{color:#66758a;font-size:10px;line-height:1.7;margin-top:24px}</style></head><body>' +
    "<h1>السجل الصحي الشامل</h1><p>ملف المريض: " + esc(patient.fullName || "غير مسجل") + "</p>" +
    section("بيانات المريض", ["البيان", "القيمة"], profile) +
    section("السجلات الطبية والحساسيات القديمة", ["النوع", "الاسم", "المادة الفعالة", "الجرعة", "التكرار", "الشدة", "التاريخ", "ملاحظات"], records) +
    section("الأدوية", ["الدواء", "المادة الفعالة", "الجرعة", "الحالة", "من", "إلى", "ملاحظات"], medications) +
    section("الحالات الصحية", ["الحالة", "الحالة", "تاريخ التشخيص", "الطبيب", "ملاحظات"], conditions) +
    section("القياسات", ["النوع", "القيمة", "الوحدة", "التاريخ", "المجال المرجعي", "ملاحظات"], measurements) +
    section("الفحوصات المخبرية", ["الفحص", "النتيجة", "الوحدة", "المجال المرجعي", "المختبر", "تاريخ السحب", "تاريخ النتيجة", "ملاحظات", "عدد المرفقات"], labs) +
    section("المواعيد", ["الموعد", "النوع", "الجهة", "التاريخ", "الحالة", "ملاحظات", "عدد المرفقات"], appointments) +
    section("سجل جرعات الأدوية", ["معرّف الدواء", "الوقت المجدول", "الحالة", "وقت التسجيل", "ملاحظات"], doses) +
    '<p class="note">تم إنشاء التقرير من البيانات المحفوظة في التطبيق. القيم معروضة كما سُجلت دون تفسير أو تشخيص طبي. تحقق من المرفقات الأصلية عند الحاجة؛ التقرير يذكر عددها ولا يدمج محتواها داخل PDF.</p></body></html>';
}
