import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAllergy } from "@/lib/allergy-store";
import { DatePickerField } from "@/components/date-picker-field";
import type { MedicalAppointment } from "@/lib/health-types";
import { requestHealthNotificationPermission } from "@/lib/notification-service";

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
const id=()=>`appointment-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

export default function AppointmentsScreen(){
 const {activePatient,updateActiveHealthData}=useAllergy();
 const [visible,setVisible]=useState(false);
 const [title,setTitle]=useState("");
 const [facility,setFacility]=useState("");
 const [appointmentDate,setAppointmentDate]=useState("");
 const [appointmentTime,setAppointmentTime]=useState("");
 const [reminderEnabled,setReminderEnabled]=useState(true);
 const [saving,setSaving]=useState(false);
 const [notes,setNotes]=useState("");
 const appointments=activePatient?.appointments??[];
 const add=async()=>{
  if(saving)return;
  if(!title.trim()||!appointmentDate||!appointmentTime.trim()){Alert.alert("بيانات ناقصة","أدخل اسم الموعد والتاريخ والساعة.");return;}
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(appointmentTime.trim())){Alert.alert("صيغة الوقت غير صحيحة","اكتب الوقت بصيغة 24 ساعة مثل 09:30.");return;}
  const [year,month,day]=appointmentDate.split("-").map(Number);
  const [hour,minute]=appointmentTime.trim().split(":").map(Number);
  const date=new Date(year,month-1,day,hour,minute,0,0);
  if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day||date.getHours()!==hour||date.getMinutes()!==minute){Alert.alert("التاريخ أو الوقت غير صحيح","تحقق من التاريخ والساعة المدخلين.");return;}
  setSaving(true);
  try{
   const permissionGranted=reminderEnabled?await requestHealthNotificationPermission():false;
   const now=new Date().toISOString();
   const item:MedicalAppointment={id:id(),type:"doctor",title:title.trim(),clinicianOrFacility:facility.trim(),startsAt:date.toISOString(),reminderMinutes:reminderEnabled&&permissionGranted?[60]:[],status:"scheduled",notes:notes.trim(),attachmentUris:[],createdAt:now,updatedAt:now};
   updateActiveHealthData({appointments:[item,...appointments]});
   setTitle("");setFacility("");setAppointmentDate("");setAppointmentTime("");setNotes("");setReminderEnabled(true);setVisible(false);
   if(reminderEnabled&&!permissionGranted)Alert.alert("تم حفظ الموعد","حُفظ الموعد، لكن لم يُفعّل التذكير لأن إذن الإشعارات غير متاح.");
  }catch{Alert.alert("تعذر حفظ الموعد","حاول مرة أخرى.");}
  finally{setSaving(false);}
 };
 const updateStatus=(item:MedicalAppointment,status:MedicalAppointment["status"])=>{
  updateActiveHealthData({appointments:appointments.map(a=>a.id===item.id?{...a,status,updatedAt:new Date().toISOString()}:a)});
 };
 const sorted=[...appointments].sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
 return <ScreenContainer className="px-5" containerClassName="bg-background" edges={["top","left","right"]} style={{backgroundColor:C.bg}}>
  <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
   <Text style={styles.kicker}>تنظيم الرعاية الصحية</Text><Text style={styles.title}>المواعيد الطبية</Text>
   <Text style={styles.subtitle}>{activePatient?.fullName?`ملف: ${activePatient.fullName}`:"اختر ملف المريض"}</Text>
   <Pressable onPress={()=>setVisible(true)} style={styles.add}><Text style={styles.addText}>＋ إضافة موعد</Text></Pressable>
   {sorted.length===0?<View style={styles.empty}><Text style={styles.emptyTitle}>لا توجد مواعيد</Text><Text style={styles.emptyText}>أضف مواعيد الأطباء والمختبر والتصوير لمتابعتها ضمن ملف كل فرد.</Text></View>:sorted.map(item=><View key={item.id} style={styles.card}>
    <View style={styles.cardHead}><View style={styles.tag}><Text style={styles.tagText}>{item.status==="scheduled"?"قادم":item.status==="completed"?"مكتمل":"ملغي"}</Text></View><View style={{flex:1}}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardSub}>{item.clinicianOrFacility||"الجهة غير محددة"}</Text></View></View>
    <Text style={styles.date}>{new Date(item.startsAt).toLocaleString("ar-JO",{dateStyle:"full",timeStyle:"short"})}</Text>
    {!!item.notes&&<Text style={styles.cardSub}>{item.notes}</Text>}
    {item.status==="scheduled"&&<View style={styles.actions}><Pressable onPress={()=>updateStatus(item,"completed")} style={styles.complete}><Text style={styles.completeText}>تحديد كمكتمل</Text></Pressable><Pressable onPress={()=>updateStatus(item,"cancelled")} style={styles.cancel}><Text style={styles.cancelText}>إلغاء الموعد</Text></Pressable></View>}
   </View>)}
   <View style={styles.notice}><Text style={styles.noticeText}>إذا سمحت بإشعارات التطبيق، يمكن تفعيل تذكير قبل الموعد بساعة. قد يؤثر نظام Android وإعدادات توفير البطارية في توقيت وصول الإشعار.</Text></View>
  </ScrollView>
  <Modal visible={visible} transparent animationType="slide" onRequestClose={()=>setVisible(false)}><View style={styles.modalRoot}><Pressable style={styles.backdrop} onPress={()=>setVisible(false)}/><View style={styles.sheet}>
   <Text style={styles.modalTitle}>موعد جديد</Text>
   <TextInput value={title} onChangeText={setTitle} placeholder="نوع الموعد أو اسمه *" placeholderTextColor={C.muted} style={styles.input} textAlign="right"/>
   <TextInput value={facility} onChangeText={setFacility} placeholder="الطبيب أو المنشأة" placeholderTextColor={C.muted} style={styles.input} textAlign="right"/>
   <DatePickerField label="تاريخ الموعد" value={appointmentDate} onChange={setAppointmentDate} placeholder="اختر التاريخ"/>
   <Text style={styles.fieldLabel}>ساعة الموعد</Text>
   <TextInput value={appointmentTime} onChangeText={setAppointmentTime} placeholder="مثال: 09:30" placeholderTextColor={C.muted} style={styles.input} textAlign="right" keyboardType="numbers-and-punctuation" maxLength={5}/>
   <TextInput value={notes} onChangeText={setNotes} placeholder="ملاحظات" placeholderTextColor={C.muted} style={styles.input} textAlign="right"/>
   <View style={styles.reminderRow}><Text style={styles.reminderLabel}>تذكير قبل الموعد بساعة</Text><Switch value={reminderEnabled} onValueChange={setReminderEnabled}/></View>
   <View style={styles.actions}><Pressable onPress={()=>{setTitle("");setFacility("");setAppointmentDate("");setAppointmentTime("");setNotes("");setReminderEnabled(true);setVisible(false);}} style={styles.cancel}><Text style={styles.cancelText}>إلغاء</Text></Pressable><Pressable disabled={saving} onPress={()=>void add()} style={[styles.complete,saving&&{opacity:0.55}]}><Text style={styles.completeText}>{saving?"جارٍ الحفظ...":"حفظ الموعد"}</Text></Pressable></View>
  </View></View></Modal>
 </ScreenContainer>;
}
const styles=StyleSheet.create({
 content:{paddingTop:20,paddingBottom:30},kicker:{color:C.teal,fontSize:13,fontWeight:"800",textAlign:"right"},title:{color:C.navy,fontSize:29,fontWeight:"900",textAlign:"right"},subtitle:{color:C.muted,fontSize:13,textAlign:"right",marginTop:4,marginBottom:15},add:{minHeight:49,backgroundColor:C.navy,borderRadius:14,alignItems:"center",justifyContent:"center",marginBottom:13},addText:{color:"#FFF",fontSize:15,fontWeight:"900"},empty:{backgroundColor:C.card,borderWidth:1,borderColor:C.line,borderRadius:18,padding:22,alignItems:"center"},emptyTitle:{color:C.navy,fontSize:17,fontWeight:"900"},emptyText:{color:C.muted,fontSize:12,textAlign:"center",lineHeight:19,marginTop:6},card:{backgroundColor:C.card,borderWidth:1,borderColor:C.line,borderRadius:17,padding:14,marginBottom:11},cardHead:{flexDirection:"row-reverse",alignItems:"center",gap:10},tag:{backgroundColor:C.soft,borderRadius:9,paddingHorizontal:9,paddingVertical:6},tagText:{color:C.teal,fontSize: 12,fontWeight:"900"},cardTitle:{color:C.navy,fontSize:15,fontWeight:"900",textAlign:"right"},cardSub:{color:C.muted,fontSize: 12,textAlign:"right",marginTop:4},date:{color:C.teal,fontSize:12,fontWeight:"800",textAlign:"right",marginTop:11},actions:{flexDirection:"row-reverse",gap:8,marginTop:12},complete:{flex:1,minHeight:40,borderRadius:10,backgroundColor:C.navy,alignItems:"center",justifyContent:"center"},completeText:{color:"#FFF",fontSize: 12,fontWeight:"800"},cancel:{flex:1,minHeight:40,borderRadius:10,backgroundColor:C.soft,alignItems:"center",justifyContent:"center"},cancelText:{color:C.teal,fontSize: 12,fontWeight:"800"},notice:{backgroundColor:C.soft,borderRadius:14,padding:12,marginTop:4},noticeText:{color:C.teal,fontSize: 12,lineHeight:18,textAlign:"right"},modalRoot:{flex:1,justifyContent:"flex-end"},backdrop:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(10,25,45,0.45)"},sheet:{backgroundColor:C.bg,borderTopLeftRadius:23,borderTopRightRadius:23,padding:18,gap:9},modalTitle:{color:C.navy,fontSize:20,fontWeight:"900",textAlign:"right"},input:{minHeight:47,backgroundColor:C.card,borderColor:C.line,borderWidth:1,borderRadius:11,paddingHorizontal:12,color:C.navy,fontSize:13},fieldLabel:{color:C.navy,fontSize:13,fontWeight:"800",textAlign:"right"},reminderRow:{minHeight:44,flexDirection:"row-reverse",alignItems:"center",justifyContent:"space-between"},reminderLabel:{color:C.navy,fontSize:13,fontWeight:"800"}
});
