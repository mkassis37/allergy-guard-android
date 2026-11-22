import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

const items=[
 {title:"ملفات العائلة",description:"إضافة أفراد الأسرة وإدارة ملفاتهم",route:"/(tabs)/patients",icon:"👨‍👩‍👧",tone:"#EAF1FC"},
 {title:"السجلات الطبية",description:"الحساسيات والأدوية القديمة والعمليات والملاحظات",route:"/(tabs)/records",icon:"▤",tone:"#EAF5F6"},
 {title:"بطاقة الطوارئ",description:"المعلومات المهمة للطبيب والمسعف",route:"/(tabs)/emergency",icon:"✚",tone:"#FFF0F3"},
 {title:"النسخ والحماية",description:"نسخ مشفر واستعادة وتحديثات التطبيق",route:"/(tabs)/settings",icon:"✓",tone:"#F2EEFA"}
];
export default function MoreScreen(){
 return <ScreenContainer className="px-5" containerClassName="bg-background" edges={["top","left","right"]} style={{backgroundColor:"#F5F8FC"}}>
  <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
   <Text style={styles.kicker}>إدارة التطبيق</Text><Text style={styles.title}>المزيد</Text>
   <Text style={styles.subtitle}>الأدوات والإعدادات الخاصة بملفات العائلة</Text>
   {items.map(item=><Pressable key={item.route} onPress={()=>router.push(item.route as any)} style={({pressed})=>[styles.card,pressed&&{opacity:.78}]}>
    <Text style={styles.arrow}>‹</Text><View style={{flex:1}}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardText}>{item.description}</Text></View><View style={[styles.icon,{backgroundColor:item.tone}]}><Text style={styles.iconText}>{item.icon}</Text></View>
   </Pressable>)}
   <View style={styles.about}><Text style={styles.aboutTitle}>Allergy & Health Tracker</Text><Text style={styles.aboutText}>فكرة وإعداد ميناس، بمساعدة ChatGPT.</Text><Text style={styles.aboutHint}>منظم للمعلومات الصحية، وليس بديلًا عن الطبيب أو التعليمات الطبية.</Text></View>
  </ScrollView>
 </ScreenContainer>;
}
const styles=StyleSheet.create({content:{paddingTop:22,paddingBottom:30},kicker:{color:"#087E8B",fontSize:13,fontWeight:"800",textAlign:"right"},title:{color:"#173B6C",fontSize:30,fontWeight:"900",textAlign:"right"},subtitle:{color:"#66758A",fontSize:13,textAlign:"right",marginTop:4,marginBottom:17},card:{backgroundColor:"#FFF",borderWidth:1,borderColor:"#E1E7F0",borderRadius:17,padding:14,marginBottom:10,flexDirection:"row-reverse",alignItems:"center",gap:12},arrow:{color:"#66758A",fontSize:25},icon:{width:43,height:43,borderRadius:13,alignItems:"center",justifyContent:"center"},iconText:{color:"#173B6C",fontSize:19,fontWeight:"900"},cardTitle:{color:"#173B6C",fontSize:15,fontWeight:"900",textAlign:"right"},cardText:{color:"#66758A",fontSize:11,lineHeight:17,textAlign:"right",marginTop:4},about:{backgroundColor:"#EAF1FC",borderRadius:17,padding:15,marginTop:10},aboutTitle:{color:"#173B6C",fontSize:14,fontWeight:"900",textAlign:"right"},aboutText:{color:"#087E8B",fontSize:12,fontWeight:"800",textAlign:"right",marginTop:6},aboutHint:{color:"#66758A",fontSize:10,textAlign:"right",marginTop:5}});
