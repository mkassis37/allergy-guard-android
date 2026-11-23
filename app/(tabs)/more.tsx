import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { AppDesign } from "@/constants/app-design";

const items=[
 {title:"ملفات العائلة",description:"إضافة أفراد الأسرة وإدارة ملفاتهم",route:"/(tabs)/patients",icon:"👨‍👩‍👧",tone:AppDesign.colors.primarySoft},
 {title:"السجلات الطبية",description:"الحساسيات والأدوية القديمة والعمليات والملاحظات",route:"/(tabs)/records",icon:"▤",tone:AppDesign.colors.tealSoft},
 {title:"بطاقة الطوارئ",description:"المعلومات المهمة للطبيب والمسعف",route:"/(tabs)/emergency",icon:"✚",tone:AppDesign.colors.dangerSoft},
 {title:"النسخ والحماية",description:"نسخ مشفر واستعادة وتحديثات التطبيق",route:"/(tabs)/settings",icon:"✓",tone:AppDesign.colors.purpleSoft}
];
export default function MoreScreen(){
 return <ScreenContainer className="px-5" containerClassName="bg-background" edges={["top","left","right"]} style={{backgroundColor:AppDesign.colors.background}}>
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
const styles=StyleSheet.create({content:{paddingTop:22,paddingBottom:30},kicker:{color:"#087E8B",fontSize:13,fontWeight:"800",textAlign:"right"},title:{color:"#142F52",fontSize:30,fontWeight:"900",textAlign:"right"},subtitle:{color:"#46566B",fontSize:13,textAlign:"right",marginTop:4,marginBottom:17},card:{backgroundColor:"#FFF",borderWidth:1,borderColor:"#D5DFEA",borderRadius:17,padding:14,marginBottom:10,flexDirection:"row-reverse",alignItems:"center",gap:12},arrow:{color:"#46566B",fontSize:25},icon:{width:43,height:43,borderRadius:13,alignItems:"center",justifyContent:"center"},iconText:{color:"#142F52",fontSize:19,fontWeight:"900"},cardTitle:{color:"#142F52",fontSize:15,fontWeight:"900",textAlign:"right"},cardText:{color:"#46566B",fontSize: 12,lineHeight:17,textAlign:"right",marginTop:4},about:{backgroundColor:"#EAF1FC",borderRadius:17,padding:15,marginTop:10},aboutTitle:{color:"#142F52",fontSize:14,fontWeight:"900",textAlign:"right"},aboutText:{color:"#087E8B",fontSize:12,fontWeight:"800",textAlign:"right",marginTop:6},aboutHint:{color:"#46566B",fontSize: 12,textAlign:"right",marginTop:5}});
