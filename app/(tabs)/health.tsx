import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAllergy } from "@/lib/allergy-store";
import type { ChronicCondition, HealthMeasurement, LabResult } from "@/lib/health-types";

type EntryMode = "condition" | "measurement" | "lab";
const C = { navy: "#173B6C", teal: "#087E8B", muted: "#66758A", bg: "#F5F8FC", card: "#FFF", line: "#E1E7F0", soft: "#EAF5F6" };
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function HealthScreen() {
  const { activePatient, updateActiveHealthData } = useAllergy();
  const [mode, setMode] = useState<EntryMode>("condition");
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [range, setRange] = useState("");
  const [notes, setNotes] = useState("");
  const conditions = activePatient?.conditions ?? [];
  const measurements = activePatient?.measurements ?? [];
  const labs = activePatient?.labResults ?? [];

  const open = (next: EntryMode) => {
    setMode(next); setName(""); setValue(""); setUnit(""); setRange(""); setNotes(""); setVisible(true);
  };
  const save = () => {
    if (!name.trim()) { Alert.alert("الاسم مطلوب", "أدخل اسم الحالة أو القياس أو الفحص."); return; }
    const now = new Date().toISOString();
    if (mode === "condition") {
      const item: ChronicCondition = { id: id("condition"), name: name.trim(), status: "active", linkedMedicationIds: [], notes: notes.trim(), createdAt: now, updatedAt: now };
      updateActiveHealthData({ conditions: [item, ...conditions] });
    } else if (mode === "measurement") {
      const numeric = Number(value);
      if (!value.trim() || !Number.isFinite(numeric)) { Alert.alert("القيمة غير صحيحة", "أدخل قيمة رقمية للقياس."); return; }
      const item: HealthMeasurement = { id: id("measurement"), type: name.trim(), value: numeric, unit: unit.trim(), measuredAt: now, referenceRange: range.trim(), notes: notes.trim() };
      updateActiveHealthData({ measurements: [item, ...measurements] });
    } else {
      if (!value.trim()) { Alert.alert("النتيجة مطلوبة", "أدخل نتيجة الفحص كما وردت في التقرير."); return; }
      const item: LabResult = { id: id("lab"), testName: name.trim(), value: value.trim(), unit: unit.trim(), referenceRange: range.trim(), resultedAt: now, attachmentUris: [], notes: notes.trim() };
      updateActiveHealthData({ labResults: [item, ...labs] });
    }
    setVisible(false);
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
          {conditions.length ? conditions.map(item => <View key={item.id} style={styles.item}><Text style={styles.itemTitle}>{item.name}</Text><Text style={styles.itemSub}>{item.status === "active" ? "نشطة" : "غير نشطة"}{item.clinician ? ` · ${item.clinician}` : ""}</Text>{!!item.notes && <Text style={styles.itemSub}>{item.notes}</Text>}</View>) : <Text style={styles.empty}>لا توجد حالات مسجلة لهذا الملف.</Text>}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}><Text style={styles.sectionTitle}>القياسات الصحية</Text><Pressable onPress={() => open("measurement")}><Text style={styles.add}>＋ إضافة</Text></Pressable></View>
          {measurements.length ? measurements.slice(0,30).map(item => <View key={item.id} style={styles.item}><Text style={styles.itemTitle}>{item.type}: {item.value} {item.unit}</Text><Text style={styles.itemSub}>{new Date(item.measuredAt).toLocaleString("ar-JO")}{item.referenceRange ? ` · المجال المرجعي: ${item.referenceRange}` : ""}</Text></View>) : <Text style={styles.empty}>أضف القياسات لمتابعتها مع مرور الوقت.</Text>}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}><Text style={styles.sectionTitle}>نتائج المختبر</Text><Pressable onPress={() => open("lab")}><Text style={styles.add}>＋ إضافة</Text></Pressable></View>
          {labs.length ? labs.slice(0,30).map(item => <View key={item.id} style={styles.item}><Text style={styles.itemTitle}>{item.testName}: {item.value} {item.unit}</Text><Text style={styles.itemSub}>{new Date(item.resultedAt).toLocaleDateString("ar-JO")}{item.referenceRange ? ` · المجال المرجعي: ${item.referenceRange}` : ""}</Text></View>) : <Text style={styles.empty}>احتفظ بنتائج الفحوصات ومجالاتها المرجعية كما وردت من المختبر.</Text>}
        </View>
        <View style={styles.notice}><Text style={styles.noticeText}>يعرض التطبيق القيم كما أدخلتها فقط. لا يفسر النتائج ولا يشخّص الأمراض، ويجب مراجعة الطبيب عند تفسيرها.</Text></View>
      </ScrollView>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.modalRoot}><Pressable style={styles.backdrop} onPress={() => setVisible(false)} /><View style={styles.sheet}>
          <Text style={styles.modalTitle}>{heading}</Text>
          <TextInput value={name} onChangeText={setName} placeholder={mode === "condition" ? "اسم الحالة" : mode === "measurement" ? "نوع القياس" : "اسم الفحص"} placeholderTextColor={C.muted} style={styles.input} textAlign="right" />
          {mode !== "condition" && <TextInput value={value} onChangeText={setValue} placeholder={mode === "measurement" ? "القيمة الرقمية" : "النتيجة"} placeholderTextColor={C.muted} style={styles.input} textAlign="right" />}
          {mode !== "condition" && <TextInput value={unit} onChangeText={setUnit} placeholder="الوحدة" placeholderTextColor={C.muted} style={styles.input} textAlign="right" />}
          {mode !== "condition" && <TextInput value={range} onChangeText={setRange} placeholder="المجال المرجعي كما في التقرير (اختياري)" placeholderTextColor={C.muted} style={styles.input} textAlign="right" />}
          <TextInput value={notes} onChangeText={setNotes} placeholder="ملاحظات (اختياري)" placeholderTextColor={C.muted} style={styles.input} textAlign="right" />
          <View style={styles.actions}><Pressable onPress={() => setVisible(false)} style={styles.cancel}><Text style={styles.cancelText}>إلغاء</Text></Pressable><Pressable onPress={save} style={styles.save}><Text style={styles.saveText}>حفظ</Text></Pressable></View>
        </View></View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content:{paddingTop:20,paddingBottom:30}, kicker:{color:C.teal,fontSize:13,fontWeight:"800",textAlign:"right"}, title:{color:C.navy,fontSize:29,fontWeight:"900",textAlign:"right"}, subtitle:{color:C.muted,fontSize:13,textAlign:"right",marginTop:4,marginBottom:15},
  section:{backgroundColor:C.card,borderWidth:1,borderColor:C.line,borderRadius:18,padding:14,marginBottom:12}, sectionHead:{flexDirection:"row-reverse",justifyContent:"space-between",alignItems:"center",marginBottom:9}, sectionTitle:{color:C.navy,fontSize:16,fontWeight:"900"}, add:{color:C.teal,fontSize:13,fontWeight:"900"}, item:{borderTopWidth:1,borderTopColor:C.line,paddingVertical:10}, itemTitle:{color:C.navy,fontSize:14,fontWeight:"800",textAlign:"right"}, itemSub:{color:C.muted,fontSize:11,textAlign:"right",marginTop:4}, empty:{color:C.muted,fontSize:12,textAlign:"right",paddingVertical:9,lineHeight:18}, notice:{backgroundColor:C.soft,padding:13,borderRadius:14}, noticeText:{color:C.teal,fontSize:11,lineHeight:18,textAlign:"right"},
  modalRoot:{flex:1,justifyContent:"flex-end"},backdrop:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(10,25,45,0.45)"},sheet:{backgroundColor:C.bg,borderTopLeftRadius:23,borderTopRightRadius:23,padding:18,gap:9},modalTitle:{color:C.navy,fontSize:20,fontWeight:"900",textAlign:"right"},input:{minHeight:47,backgroundColor:C.card,borderColor:C.line,borderWidth:1,borderRadius:11,paddingHorizontal:12,color:C.navy,fontSize:13},actions:{flexDirection:"row-reverse",gap:8,marginTop:5},cancel:{flex:1,minHeight:46,borderRadius:11,borderWidth:1,borderColor:C.line,alignItems:"center",justifyContent:"center"},cancelText:{color:C.muted,fontWeight:"800"},save:{flex:1,minHeight:46,borderRadius:11,backgroundColor:C.navy,alignItems:"center",justifyContent:"center"},saveText:{color:"#FFF",fontWeight:"900"}
});
