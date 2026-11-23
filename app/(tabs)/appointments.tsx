import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAllergy } from "@/lib/allergy-store";
import type { MedicalAppointment } from "@/lib/health-types";
import { requestHealthNotificationPermission } from "@/lib/notification-service";

const C={navy:"#173B6C",teal:"#087E8B",muted:"#66758A",bg:"#F5F8FC",card:"#FFF",line:"#E1E7F0",soft:"#EAF5F6"};
const id=()=>`appointment-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

export default function AppointmentsScreen(){
 const {activePatient,updateActiveHealthData}=useAllergy();
 const [visible,setVisible]=useState(false);
 const [title,setTitle]=useState("");
 const [facility,setFacility]=useState("");
 const [dateTime,setDateTime]=useState("");
 const [notes,setNotes]=useState("");
 const appointments=activePatient?.appointments??[];
 const add=async()=>{
  if(!title.trim()||!dateTime.trim()){Alert.alert("بيانات ناقصة","أدخل اسم الموعد وتاريخه ووقته.");return;}
  const normalized=dateTime.trim().replace(" ","T");
  const date=new Date(normalized);
  if(Number.isNaN(date.getTime())){Alert.alert("التاريخ غير صحيح","استخدم الصيغة: 2026-12-05 10:30");return;}
  const permissionGranted=await requestHealthNotificationPermission();
  const now=new Date().toISOString();
  const item:MedicalAppointment={id:id(),type:"doctor",title:title.trim(),clinicianOrFacility:facility.trim(),startsAt:date.toISOString(),reminderMinutes:permissionGranted?[60]:[],status:"scheduled",notes:notes.trim(),attachmentUris:[],createdAt:now,updatedAt:now};
  updateActiveHealthData({appointments:[item,...appointments]});
  setTitle("");setFacility("");setDateTime("");setNotes("");setVisible(false);
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
   <View style={styles.notice}><Text style={styles.noticeText}>إذا سمحت بإشعارات التطبيق، يُجدول تذكير قبل الموعد بساعة. قد يؤثر نظام Android وإعدادات توفير البطارية في توقيت وصول الإشعار.</Text></View>
  </ScrollView>
  <Modal visible={visible} transparent animationType="slide" onRequestClose={()=>setVisible(false)}><View style={styles.modalRoot}><Pressable style={styles.backdrop} onPress={()=>setVisible(false)}/><View style={styles.sheet}>
   <Text style={styles.modalTitle}>موعد جديد</Text>
   <TextInput value={title} onChangeText={setTitle} placeholder="نوع الموعد أو اسمه *" placeholderTextColor={C.muted} style={styles.input} textAlign="right"/>
   <TextInput value={facility} onChangeText={setFacility} placeholder="الطبيب أو المنشأة" placeholderTextColor={C.muted} style={styles.input} textAlign="right"/>
   <TextInput value={dateTime} onChangeText={setDateTime} placeholder="التاريخ والوقت: 2026-12-05 10:30 *" placeholderTextColor={C.muted} style={styles.input} textAlign="right" autoCapitalize="none"/>
   <TextInput value={notes} onChangeText={setNotes} placeholder="ملاحظات" placeholderTextColor={C.muted} style={styles.input} textAlign="right"/>
   <View style={styles.actions}><Pressable onPress={()=>setVisible(false)} style={styles.cancel}><Text style={styles.cancelText}>إلغاء</Text></Pressable><Pressable onPress={add} style={styles.complete}><Text style={styles.completeText}>حفظ الموعد</Text></Pressable></View>
  </View></View></Modal>
 </ScreenContainer>;
}
const styles=StyleSheet.create({
 content:{paddingTop:20,paddingBottom:30},kicker:{color:C.teal,fontSize:13,fontWeight:"800",textAlign:"right"},title:{color:C.navy,fontSize:29,fontWeight:"900",textAlign:"right"},subtitle:{color:C.muted,fontSize:13,textAlign:"right",marginTop:4,marginBottom:15},add:{minHeight:49,backgroundColor:C.navy,borderRadius:14,alignItems:"center",justifyContent:"center",marginBottom:13},addText:{color:"#FFF",fontSize:15,fontWeight:"900"},empty:{backgroundColor:C.card,borderWidth:1,borderColor:C.line,borderRadius:18,padding:22,alignItems:"center"},emptyTitle:{color:C.navy,fontSize:17,fontWeight:"900"},emptyText:{color:C.muted,fontSize:12,textAlign:"center",lineHeight:19,marginTop:6},card:{backgroundColor:C.card,borderWidth:1,borderColor:C.line,borderRadius:17,padding:14,marginBottom:11},cardHead:{flexDirection:"row-reverse",alignItems:"center",gap:10},tag:{backgroundColor:C.soft,borderRadius:9,paddingHorizontal:9,paddingVertical:6},tagText:{color:C.teal,fontSize:10,fontWeight:"900"},cardTitle:{color:C.navy,fontSize:15,fontWeight:"900",textAlign:"right"},cardSub:{color:C.muted,fontSize:11,textAlign:"right",marginTop:4},date:{color:C.teal,fontSize:12,fontWeight:"800",textAlign:"right",marginTop:11},actions:{flexDirection:"row-reverse",gap:8,marginTop:12},complete:{flex:1,minHeight:40,borderRadius:10,backgroundColor:C.navy,alignItems:"center",justifyContent:"center"},completeText:{color:"#FFF",fontSize:11,fontWeight:"800"},cancel:{flex:1,minHeight:40,borderRadius:10,backgroundColor:C.soft,alignItems:"center",justifyContent:"center"},cancelText:{color:C.teal,fontSize:11,fontWeight:"800"},notice:{backgroundColor:C.soft,borderRadius:14,padding:12,marginTop:4},noticeText:{color:C.teal,fontSize:11,lineHeight:18,textAlign:"right"},modalRoot:{flex:1,justifyContent:"flex-end"},backdrop:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(10,25,45,0.45)"},sheet:{backgroundColor:C.bg,borderTopLeftRadius:23,borderTopRightRadius:23,padding:18,gap:9},modalTitle:{color:C.navy,fontSize:20,fontWeight:"900",textAlign:"right"},input:{minHeight:47,backgroundColor:C.card,borderColor:C.line,borderWidth:1,borderRadius:11,paddingHorizontal:12,color:C.navy,fontSize:13}
});
