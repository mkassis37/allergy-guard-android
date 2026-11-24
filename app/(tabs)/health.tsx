import { useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ScreenContainer } from "@/components/screen-container";
import { useAllergy } from "@/lib/allergy-store";
import { DatePickerField } from "@/components/date-picker-field";
import type { ChronicCondition, HealthMeasurement, LabResult } from "@/lib/health-types";
import { buildPatientTimeline } from "@/lib/health-records";
import { buildPatientHealthReportHtml } from "@/lib/health-report";

type EntryMode = "condition" | "measurement" | "lab";
import { AppDesign } from "@/constants/app-design";
const C = {
  navy: AppDesign.colors.navy,
  teal: AppDesign.colors.teal,
  muted: AppDesign.colors.muted,
  bg: AppDesign.colors.background,
  card: AppDesign.colors.surface,
  line: AppDesign.colors.border,
  soft: AppDesign.colors.tealSoft,
};
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalDateInput(value?: string) {
  if (!value) return localDateString();
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? localDateString() : localDateString(parsed);
}

export default function HealthScreen() {
  const { activePatient, updateActiveHealthData } = useAllergy();
  const [mode, setMode] = useState<EntryMode>("condition");
  const [visible, setVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordDate, setRecordDate] = useState(localDateString());
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [range, setRange] = useState("");
  const [notes, setNotes] = useState("");
  const conditions = activePatient?.conditions ?? [];
  const measurements = activePatient?.measurements ?? [];
  const labs = activePatient?.labResults ?? [];
  const timeline = activePatient ? buildPatientTimeline(activePatient).slice(0, 12) : [];
  const chartType = measurements[0]?.type;
  const chartUnit = measurements[0]?.unit;
  const chartSeries = measurements.filter((item) => item.type === chartType && item.unit === chartUnit && typeof item.value === "number").slice(0, 7).reverse();
  const chartMax = Math.max(1, ...chartSeries.map((item) => Math.abs(Number(item.value))));
  const exportReport = async () => {
    if (!activePatient) { Alert.alert("لا يوجد ملف", "اختر ملف المريض أولًا."); return; }
    try {
      const html = buildPatientHealthReportHtml(activePatient);
      if (Platform.OS === "web") { await Print.printAsync({ html }); return; }
      const file = await Print.printToFileAsync({ html });
      if (!(await Sharing.isAvailableAsync())) throw new Error("المشاركة غير متاحة على هذا الجهاز.");
      await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", dialogTitle: "مشاركة التقرير الصحي الشامل" });
    } catch (error) { Alert.alert("تعذر إنشاء التقرير", error instanceof Error ? error.message : "حدث خطأ غير متوقع."); }
  };

  const open = (next: EntryMode) => {
    setMode(next); setEditingId(null); setName(""); setValue(""); setUnit(""); setRange(""); setNotes(""); setRecordDate(localDateString()); setVisible(true);
  };
  const edit = (next: EntryMode, item: ChronicCondition | HealthMeasurement | LabResult) => {
    setMode(next); setEditingId(item.id); setName(next === "condition" ? (item as ChronicCondition).name : next === "measurement" ? (item as HealthMeasurement).type : (item as LabResult).testName);
    setValue(next === "condition" ? "" : String((item as HealthMeasurement | LabResult).value));
    setUnit(next === "condition" ? "" : (item as HealthMeasurement | LabResult).unit);
    setRange(next === "condition" ? "" : ((item as HealthMeasurement | LabResult).referenceRange || ""));
    setNotes(item.notes || "");
    const date = next === "condition" ? (item as ChronicCondition).diagnosedAt : next === "measurement" ? (item as HealthMeasurement).measuredAt : (item as LabResult).resultedAt;
    setRecordDate(toLocalDateInput(date)); setVisible(true);
  };
  const remove = (next: EntryMode, itemId: string) => {
    Alert.alert("تأكيد الحذف", "هل تريد حذف هذا السجل من ملف المريض؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: () => {
        if (next === "condition") updateActiveHealthData({ conditions: conditions.filter((item) => item.id !== itemId) });
        else if (next === "measurement") updateActiveHealthData({ measurements: measurements.filter((item) => item.id !== itemId) });
        else updateActiveHealthData({ labResults: labs.filter((item) => item.id !== itemId) });
      } },
    ]);
  };
  const save = () => {
    if (!name.trim()) { Alert.alert("الاسم مطلوب", "أدخل اسم الحالة أو القياس أو الفحص."); return; }
    const now = new Date().toISOString();
    const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(recordDate) ? new Date(recordDate + "T12:00:00").toISOString() : now;
    if (mode === "condition") {
      const previous = conditions.find((item) => item.id === editingId);
      const item: ChronicCondition = { id: editingId || id("condition"), name: name.trim(), status: previous?.status || "active", diagnosedAt: selectedDate, linkedMedicationIds: previous?.linkedMedicationIds || [], clinician: previous?.clinician, notes: notes.trim(), createdAt: previous?.createdAt || now, updatedAt: now };
      updateActiveHealthData({ conditions: editingId ? conditions.map((entry) => entry.id === editingId ? item : entry) : [item, ...conditions] });
    } else if (mode === "measurement") {
      const numeric = Number(value);
      if (!value.trim() || !Number.isFinite(numeric)) { Alert.alert("القيمة غير صحيحة", "أدخل قيمة رقمية للقياس."); return; }
      const previous = measurements.find((item) => item.id === editingId);
      const item: HealthMeasurement = { id: editingId || id("measurement"), type: name.trim(), value: numeric, unit: unit.trim(), measuredAt: selectedDate, referenceRange: range.trim(), notes: notes.trim(), source: previous?.source, conditionId: previous?.conditionId };
      updateActiveHealthData({ measurements: editingId ? measurements.map((entry) => entry.id === editingId ? item : entry) : [item, ...measurements] });
    } else {
      if (!value.trim()) { Alert.alert("النتيجة مطلوبة", "أدخل نتيجة الفحص كما وردت في التقرير."); return; }
      const previous = labs.find((item) => item.id === editingId);
      const item: LabResult = { id: editingId || id("lab"), testName: name.trim(), value: value.trim(), unit: unit.trim(), referenceRange: range.trim(), resultedAt: selectedDate, attachmentUris: previous?.attachmentUris || [], notes: notes.trim(), laboratory: previous?.laboratory, collectedAt: previous?.collectedAt };
      updateActiveHealthData({ labResults: editingId ? labs.map((entry) => entry.id === editingId ? item : entry) : [item, ...labs] });
    }
    setVisible(false); setEditingId(null);
  };

  const heading = mode === "condition" ? "إضافة حالة مزمنة" : mode === "measurement" ? "إضافة قياس صحي" : "إضافة نتيجة فحص";
  return (
    <ScreenContainer className="px-5" containerClassName="bg-background" edges={["top","left","right"]} style={{ backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>المتابعة الصحية</Text>
        <Text style={styles.title}>الصحة والقياسات</Text>
        <Text style={styles.subtitle}>{activePatient?.fullName ? `ملف: ${activePatient.fullName}` : "اختر ملف المريض"}</Text>

        <View style={styles.section}>
          <View style={styles.sectionHead}><Text style={styles.sectionTitle}>الحالات المزمنة</Text><Pressable onPress={() => open("condition")}><Text style={styles.add}>＋ إضافة</Text></Pressable></View>
          {conditions.length ? conditions.map(item => <View key={item.id} style={styles.item}><Text style={styles.itemTitle}>{item.name}</Text><Text style={styles.itemSub}>{item.status === "active" ? "نشطة" : "غير نشطة"}{item.clinician ? ` · ${item.clinician}` : ""}</Text>{!!item.notes && <Text style={styles.itemSub}>{item.notes}</Text>}<View style={styles.rowActions}><Pressable onPress={() => edit("condition", item)}><Text style={styles.action}>تعديل</Text></Pressable><Pressable onPress={() => remove("condition", item.id)}><Text style={styles.delete}>حذف</Text></Pressable></View></View>) : <Text style={styles.empty}>لا توجد حالات مسجلة لهذا الملف.</Text>}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}><Text style={styles.sectionTitle}>القياسات الصحية</Text><Pressable onPress={() => open("measurement")}><Text style={styles.add}>＋ إضافة</Text></Pressable></View>
          {measurements.length ? measurements.slice(0,30).map(item => <View key={item.id} style={styles.item}><Text style={styles.itemTitle}>{item.type}: {item.value} {item.unit}</Text><Text style={styles.itemSub}>{new Date(item.measuredAt).toLocaleString("ar-JO")}{item.referenceRange ? ` · المجال المرجعي: ${item.referenceRange}` : ""}</Text><View style={styles.rowActions}><Pressable onPress={() => edit("measurement", item)}><Text style={styles.action}>تعديل</Text></Pressable><Pressable onPress={() => remove("measurement", item.id)}><Text style={styles.delete}>حذف</Text></Pressable></View></View>) : <Text style={styles.empty}>أضف القياسات لمتابعتها مع مرور الوقت.</Text>}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}><Text style={styles.sectionTitle}>نتائج المختبر</Text><Pressable onPress={() => open("lab")}><Text style={styles.add}>＋ إضافة</Text></Pressable></View>
          {labs.length ? labs.slice(0,30).map(item => <View key={item.id} style={styles.item}><Text style={styles.itemTitle}>{item.testName}: {item.value} {item.unit}</Text><Text style={styles.itemSub}>{new Date(item.resultedAt).toLocaleDateString("ar-JO")}{item.referenceRange ? ` · المجال المرجعي: ${item.referenceRange}` : ""}</Text><View style={styles.rowActions}><Pressable onPress={() => edit("lab", item)}><Text style={styles.action}>تعديل</Text></Pressable><Pressable onPress={() => remove("lab", item.id)}><Text style={styles.delete}>حذف</Text></Pressable></View></View>) : <Text style={styles.empty}>احتفظ بنتائج الفحوصات ومجالاتها المرجعية كما وردت من المختبر.</Text>}
        </View>
        <View style={styles.section}>
          <View style={styles.sectionHead}><Text style={styles.sectionTitle}>مؤشر القياسات</Text></View>
          {chartSeries.length > 0 ? <>
            <Text style={styles.itemSub}>آخر القياسات من النوع {chartType} ({chartUnit || "دون وحدة"}) — لا تتم مقارنة أنواع أو وحدات مختلفة</Text>
            <View style={styles.chartRow}>{chartSeries.map((item) => <View key={item.id} style={styles.chartColumn}>
              <Text style={styles.chartValue}>{String(item.value)}</Text>
              <View style={styles.chartTrack}><View style={[styles.chartBar, { height: Math.max(5, Math.round(Math.abs(Number(item.value)) / chartMax * 86)) }]} /></View>
              <Text style={styles.chartDate}>{item.measuredAt.slice(0, 10)}</Text>
            </View>)}</View>
          </> : <Text style={styles.empty}>أضف عدة قياسات من النوع والوحدة نفسيهما لعرض تطورها.</Text>}
        </View>
        <View style={styles.section}>
          <View style={styles.sectionHead}><Text style={styles.sectionTitle}>الخط الزمني الطبي</Text></View>
          {timeline.length ? timeline.map((entry) => <View key={entry.id} style={styles.item}>
            <Text style={styles.itemTitle}>{entry.title}</Text>
            <Text style={styles.itemSub}>{entry.date ? new Date(entry.date).toLocaleDateString("ar-JO") : "دون تاريخ"} · {entry.category}</Text>
            {!!entry.detail && <Text style={styles.itemSub}>{entry.detail}</Text>}
          </View>) : <Text style={styles.empty}>ستظهر هنا الأحداث الطبية من السجلات القديمة والجديدة.</Text>}
        </View>
        <Pressable onPress={exportReport} style={styles.reportButton}><Text style={styles.reportButtonText}>إنشاء التقرير الصحي الشامل PDF</Text></Pressable>
        <View style={styles.notice}><Text style={styles.noticeText}>يعرض التطبيق القيم كما أدخلتها فقط. لا يفسر النتائج ولا يشخّص الأمراض، ويجب مراجعة الطبيب عند تفسيرها.</Text></View>
      </ScrollView>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.modalRoot}><Pressable style={styles.backdrop} onPress={() => setVisible(false)} /><View style={styles.sheet}>
          <Text style={styles.modalTitle}>{editingId ? "تعديل السجل" : heading}</Text>
          <TextInput value={name} onChangeText={setName} placeholder={mode === "condition" ? "اسم الحالة" : mode === "measurement" ? "نوع القياس" : "اسم الفحص"} placeholderTextColor={C.muted} style={styles.input} textAlign="right" />
          {mode !== "condition" && <TextInput value={value} onChangeText={setValue} placeholder={mode === "measurement" ? "القيمة الرقمية" : "النتيجة"} placeholderTextColor={C.muted} style={styles.input} textAlign="right" />}
          {mode !== "condition" && <TextInput value={unit} onChangeText={setUnit} placeholder="الوحدة" placeholderTextColor={C.muted} style={styles.input} textAlign="right" />}
          {mode !== "condition" && <TextInput value={range} onChangeText={setRange} placeholder="المجال المرجعي كما في التقرير (اختياري)" placeholderTextColor={C.muted} style={styles.input} textAlign="right" />}
          <DatePickerField label="تاريخ السجل" value={recordDate} onChange={setRecordDate} placeholder="اختر التاريخ" />
          <TextInput value={notes} onChangeText={setNotes} placeholder="ملاحظات (اختياري)" placeholderTextColor={C.muted} style={styles.input} textAlign="right" />
          <View style={styles.actions}><Pressable onPress={() => setVisible(false)} style={styles.cancel}><Text style={styles.cancelText}>إلغاء</Text></Pressable><Pressable onPress={save} style={styles.save}><Text style={styles.saveText}>{editingId ? "حفظ التعديل" : "حفظ"}</Text></Pressable></View>
        </View></View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content:{paddingTop:20,paddingBottom:30}, kicker:{color:C.teal,fontSize:13,fontWeight:"800",textAlign:"right"}, title:{color:C.navy,fontSize:29,fontWeight:"900",textAlign:"right"}, subtitle:{color:C.muted,fontSize:13,textAlign:"right",marginTop:4,marginBottom:15},
  rowActions:{flexDirection:"row-reverse",gap:18,marginTop:8}, action:{color:C.teal,fontSize:12,fontWeight:"900"}, delete:{color:"#B4233A",fontSize:12,fontWeight:"900"},
  chartRow:{flexDirection:"row-reverse",alignItems:"flex-end",justifyContent:"space-around",minHeight:140,marginTop:10}, chartColumn:{flex:1,alignItems:"center",justifyContent:"flex-end",gap:5}, chartValue:{fontSize: 12,color:C.navy,fontWeight:"800"}, chartTrack:{height:90,width:16,backgroundColor:"#E8EEF4",borderRadius:8,justifyContent:"flex-end",overflow:"hidden"}, chartBar:{width:16,backgroundColor:C.teal,borderRadius:8}, chartDate:{fontSize: 12,color:C.muted}, reportButton:{minHeight:48,backgroundColor:C.navy,borderRadius:13,alignItems:"center",justifyContent:"center",marginBottom:14},reportButtonText:{color:"#FFF",fontWeight:"900",fontSize:13},
  section:{backgroundColor:C.card,borderWidth:1,borderColor:C.line,borderRadius:18,padding:14,marginBottom:12}, sectionHead:{flexDirection:"row-reverse",justifyContent:"space-between",alignItems:"center",marginBottom:9}, sectionTitle:{color:C.navy,fontSize:16,fontWeight:"900"}, add:{color:C.teal,fontSize:13,fontWeight:"900"}, item:{borderTopWidth:1,borderTopColor:C.line,paddingVertical:10}, itemTitle:{color:C.navy,fontSize:14,fontWeight:"800",textAlign:"right"}, itemSub:{color:C.muted,fontSize: 12,textAlign:"right",marginTop:4}, empty:{color:C.muted,fontSize:12,textAlign:"right",paddingVertical:9,lineHeight:18}, notice:{backgroundColor:C.soft,padding:13,borderRadius:14}, noticeText:{color:C.teal,fontSize: 12,lineHeight:18,textAlign:"right"},
  modalRoot:{flex:1,justifyContent:"flex-end"},backdrop:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(10,25,45,0.45)"},sheet:{backgroundColor:C.bg,borderTopLeftRadius:23,borderTopRightRadius:23,padding:18,gap:9},modalTitle:{color:C.navy,fontSize:20,fontWeight:"900",textAlign:"right"},input:{minHeight:47,backgroundColor:C.card,borderColor:C.line,borderWidth:1,borderRadius:11,paddingHorizontal:12,color:C.navy,fontSize:13},actions:{flexDirection:"row-reverse",gap:8,marginTop:5},cancel:{flex:1,minHeight:46,borderRadius:11,borderWidth:1,borderColor:C.line,alignItems:"center",justifyContent:"center"},cancelText:{color:C.muted,fontWeight:"800"},save:{flex:1,minHeight:46,borderRadius:11,backgroundColor:C.navy,alignItems:"center",justifyContent:"center"},saveText:{color:"#FFF",fontWeight:"900"}
});
