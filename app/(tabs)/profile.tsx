import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 🛑 보안 주의: 실제 서비스 시에는 .env 파일을 사용하거나 서버를 통해 호출하세요.
const GEMINI_API_KEY = "AIzaSyCzLkzatgWyU48HkAPdsDO36Ljk7T_pv9U"; 
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface UserData {
  email: string;
  level: number;
  exp: number;
  totalDistance: number;
  characterType: string;
  nickname?: string;
  photoURL?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export default function ProfileScreen() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [userRank, setUserRank] = useState<number>(0);
  const [expectedReward, setExpectedReward] = useState<string>("순위권 밖 (다음 달을 노려보세요!)");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: '안녕하세요! 🏃‍♂️ 러닝 페이스 조절, 마라톤 준비, 부상 방지 등 궁금한 점을 물어보세요!' }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    const fetchUserDataAndRank = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userDocRef = doc(db, "users", user.uid);
        const rankQuery = query(collection(db, "users"), orderBy("totalDistance", "desc"));
        
        const [userDoc, usersSnapshot] = await Promise.all([
          getDoc(userDocRef),
          getDocs(rankQuery)
        ]);

        if (userDoc.exists()) {
          const data = userDoc.data() as UserData;
          setUserData(data);
          setTempName(data.nickname || "");
        }

        let rankIndex = -1;
        usersSnapshot.docs.forEach((d, index) => {
          if (d.id === user.uid) {
            rankIndex = index + 1;
          }
        });

        setUserRank(rankIndex);
        
        if (rankIndex === 1) setExpectedReward("🎁 에어팟 맥스");
        else if (rankIndex === 2) setExpectedReward("🎁 에어팟 3세대");
        else if (rankIndex === 3) setExpectedReward("☕ 스타벅스 기프티콘");
        
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDataAndRank();
  }, []);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const newPhotoURL = result.assets[0].uri;
      
      try {
        await updateDoc(doc(db, "users", auth.currentUser!.uid), { photoURL: newPhotoURL });
        setUserData(prev => prev ? { ...prev, photoURL: newPhotoURL } : null);
      } catch (error) {
        Alert.alert("오류", "프로필 사진 업데이트에 실패했습니다.");
      }
    }
  };

  const handleSaveNickname = async () => {
    if (!tempName.trim()) {
      Alert.alert("알림", "닉네임을 입력해주세요.");
      return;
    }
    
    try {
      await updateDoc(doc(db, "users", auth.currentUser!.uid), { nickname: tempName });
      setUserData(prev => prev ? { ...prev, nickname: tempName } : null);
      setIsEditingName(false);
    } catch (error) {
      Alert.alert("오류", "닉네임 저장에 실패했습니다.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      Alert.alert("오류", "로그아웃에 실패했습니다.");
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const userText = chatInput;
    const newMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: userText };
    setChatMessages(prev => [...prev, newMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const nickname = userData?.nickname || "러너";
      const level = userData?.level || 1;
      const totalDistance = userData?.totalDistance || 0;
      const rank = userRank > 0 ? `${userRank}위` : "랭킹 산정 중";

      const prompt = `
[역할 및 페르소나]
너는 열정적이고 전문적인 최고의 마라톤 및 러닝 코치야. 
항상 활기찬 이모지를 적절히 섞어 쓰며, 사용자를 모티베이션(동기부여)해주는 따뜻하고 에너제틱한 톤앤매너로 말해줘.
모든 답변은 마라톤 이론과 부상 방지 가이드에 기반하여 전문적이면서도, 이해하기 쉽게 핵심만 3줄 내외로 짧고 명확하게 대답해줘.

[현재 대화 중인 러너 정보]
- 이름/닉네임: ${nickname}
- 회원 레벨: Lv.${level}
- 누적 러닝 거리: ${totalDistance}km
- 현재 러닝 챌린지 순위: ${rank}

[지침]
1. 답변을 시작할 때 반드시 러너의 이름을 친근하게 부르며 인사하거나 격려해줘. (예: "${nickname}님, 오늘 훈련도 파이팅입니다! 🔥")
2. 질문 내용이 누적 거리나 순위 등 개인 기록과 관련된 뉘앙스라면 위의 [러너 정보]를 적극적으로 인용해서 칭찬이나 조언을 건네줘.
3. 질문에 러닝과 전혀 상관없는 내용이 들어오면, 위트 있게 러닝 코치로서 본분을 리마인드시키며 러닝 이야기로 유도해줘.

질문: ${userText}
      `.trim();
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      
      const responseText = result.response.text();

      const aiMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Gemini API 호출 중 에러 발생:", error);
      const errorMessage: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: "코치와 연결하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요!" 
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]} >
        <ActivityIndicator size="large" color="#1D4ED8" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 상단 웰컴 배너 */}
        <View style={styles.header}>
          <Ionicons name="sparkles" size={18} color="#ff4bd8" style={{ marginRight: 6 }} />
          <Text style={styles.welcomeText}>환영합니다! 오늘도 힘차게 달려볼까요?</Text>
        </View>

        {/* 프로필 카드 섹션 */}
        <View style={styles.profileCard}>
          <TouchableOpacity style={styles.avatarBox} onPress={handlePickImage}>
            {userData?.photoURL ? (
              <Image source={{ uri: userData.photoURL }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarEmoji}>🏃</Text>
            )}
            <View style={styles.cameraIconBadge}>
              <Ionicons name="camera" size={12} color="#FFF" />
            </View>
          </TouchableOpacity>
          
          {isEditingName ? (
            <View style={styles.nicknameEditContainer}>
              <TextInput
                style={styles.nicknameInput}
                value={tempName}
                onChangeText={setTempName}
                placeholder="새 닉네임 입력"
                placeholderTextColor="#94A3B8"
                maxLength={10}
              />
              <TouchableOpacity onPress={handleSaveNickname} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>저장</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.nicknameContainer}>
              <Text style={styles.emailText}>
                {userData?.nickname || userData?.email || auth.currentUser?.email}
              </Text>
              <TouchableOpacity onPress={() => setIsEditingName(true)} style={styles.editIconBtn}>
                <Ionicons name="pencil" size={14} color="#1D4ED8" />
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.divider} />

          {/* 주요 운동 스탯 */}
          <View style={styles.infoRow}>
            <View style={styles.labelGroup}>
              <Ionicons name="flash" size={18} color="#0284C7" style={{ marginRight: 8 }} />
              <Text style={styles.infoLabel}>레벨</Text>
            </View>
            <Text style={styles.infoValue}>Lv. {userData?.level || 1}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.labelGroup}>
              <Ionicons name="ribbon" size={18} color="#0284C7" style={{ marginRight: 8 }} />
              <Text style={styles.infoLabel}>경험치</Text>
            </View>
            <Text style={styles.infoValue}>{userData?.exp || 0} EXP</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.labelGroup}>
              <Ionicons name="footsteps" size={18} color="#A3E635" style={{ marginRight: 8 }} />
              <Text style={styles.infoLabel}>누적 러닝 거리</Text>
            </View>
            <Text style={[styles.infoValue, styles.highlightValue]}>{userData?.totalDistance || 0} km</Text>
          </View>
        </View>

        {/* 🏆 챌린지 & 리워드 보드 */}
        <View style={styles.rewardContainer}>
          <Text style={styles.sectionTitle}>월간 러닝 챌린지 리포트</Text>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardLabel}>🏆 현재 내 순위</Text>
            <Text style={styles.rewardValue}>{userRank > 0 ? `${userRank}위` : "-"}</Text>
          </View>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardLabel}>🎁 예상 수령 상품</Text>
            <Text style={[styles.rewardValue, { color: '#EA580C' }]}>
              {expectedReward}
            </Text>
          </View>
        </View>

        {/* AI 코치 버튼 */}
        <TouchableOpacity style={styles.chatbotOpenBtn} onPress={() => setIsChatOpen(true)}>
          <Ionicons name="chatbubble-ellipses" size={22} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.chatbotOpenBtnText}>AI 러닝 코치 매칭하기</Text>
        </TouchableOpacity>

        {/* 로그아웃 버튼 */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 챗봇 모달 */}
<Modal visible={isChatOpen} animationType="slide" presentationStyle="pageSheet">
  {/* 1. KeyboardAvoidingView가 가장 바깥에서 전체를 감싸도록 합니다. */}
  <KeyboardAvoidingView 
    style={{ flex: 1, backgroundColor: '#F8FAFC' }} 
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    // ios pageSheet 모달의 상단 헤더 높이 등을 고려해 오프셋을 줍니다. 보통 40~60 사이가 적당합니다.
    keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0} 
  >
    <SafeAreaView style={styles.chatModalContainer}>
      
      {/* 모달 헤더 */}
      <View style={styles.chatHeader}>
        <Text style={styles.chatTitle}>🏃‍♂️ AI 러닝 라이브 코칭</Text>
        <TouchableOpacity style={styles.chatCloseBtn} onPress={() => setIsChatOpen(false)}>
          <Ionicons name="close" size={24} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {/* 채팅 메시지 리스트 */}
      {/* 2. ScrollView가 남은 공간을 모두 차지하도록 flex: 1을 줍니다. */}
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.chatScrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {chatMessages.map((msg) => (
          <View key={msg.id} style={[
            styles.chatBubble, 
            msg.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleModel
          ]}>
            <Text style={[
              styles.chatText,
              msg.role === 'user' ? styles.chatTextUser : styles.chatTextModel
            ]}>{msg.text}</Text>
          </View>
        ))}
        {isChatLoading && (
          <View style={[styles.chatBubble, styles.chatBubbleModel, { paddingVertical: 15 }]}>
            <ActivityIndicator size="small" color="#1D4ED8" />
          </View>
        )}
      </ScrollView>

      {/* 입력창 구역 */}
      <View style={styles.chatInputContainer}>
        <TextInput
          style={styles.chatInput}
          placeholder="러닝 루틴, 부상 방지 등 무엇이든 물어보세요!"
          placeholderTextColor="#94A3B8"
          value={chatInput}
          onChangeText={setChatInput}
          onSubmitEditing={handleSendChat}
        />
        <TouchableOpacity style={styles.chatSendBtn} onPress={handleSendChat}>
          <Ionicons name="arrow-up" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  </KeyboardAvoidingView>
</Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // 전반적인 테마 배경: 홈 화면의 깨끗하고 산뜻한 무드를 위한 화이트-블루시 스킨 테마
  container: { flex: 1, backgroundColor: '#F1F5F9' }, 
  scrollContent: { padding: 20, paddingBottom: 40 }, 
  
  header: { marginTop: 10, marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  welcomeText: { fontSize: 15, fontWeight: '600', color: '#64748B', letterSpacing: -0.5 },
  
  // 메인 카드 디자인: 깔끔한 화이트 바탕에 소프트 보더
  profileCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  
  avatarBox: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginBottom: 16, position: 'relative', borderWidth: 2, borderColor: '#3B82F6' },
  avatarEmoji: { fontSize: 44 },
  avatarImage: { width: 86, height: 86, borderRadius: 43 },
  cameraIconBadge: { position: 'absolute', bottom: 0, right: 2, backgroundColor: '#1D4ED8', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  
  nicknameContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 4 },
  emailText: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  editIconBtn: { marginLeft: 8, backgroundColor: '#EFF6FF', padding: 6, borderRadius: 50 },
  
  nicknameEditContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  nicknameInput: { borderBottomWidth: 2, borderBottomColor: '#1D4ED8', fontSize: 16, color: '#1E293B', width: 140, textAlign: 'center', paddingVertical: 6 },
  saveBtn: { backgroundColor: '#1D4ED8', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginLeft: 10 },
  saveBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  
  divider: { width: '100%', height: 1, backgroundColor: '#F1F5F9', marginBottom: 20 },
  
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 18, alignItems: 'center' },
  labelGroup: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { fontSize: 15, color: '#64748B', fontWeight: '500' },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#334155' },
  highlightValue: { color: '#EA580C', fontSize: 18, fontWeight: '700' }, // 트랙 오렌지 컬러 매칭
  
  // 랭킹 리포트 구역
  rewardContainer: { width: '100%', marginTop: 20, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#64748B', marginBottom: 14 },
  rewardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  rewardLabel: { fontSize: 14, color: '#334155' },
  rewardValue: { fontSize: 15, fontWeight: '700', color: '#1E293B' },

  // 하이라이트 메인 액션 버튼 (RelayMate 메인 로열 블루 컬러 반영)
  chatbotOpenBtn: { flexDirection: 'row', backgroundColor: '#1D4ED8', width: '100%', padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 24, shadowColor: '#1D4ED8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6 },
  chatbotOpenBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  logoutBtn: { marginTop: 20, backgroundColor: 'transparent', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#EF4444' },
  logoutBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '600' },

  // AI 채팅 내부 라이트 모드 스타일 최적화
  chatModalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  chatTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  chatCloseBtn: { backgroundColor: '#F1F5F9', padding: 4, borderRadius: 50 },
  
  chatScrollContent: { padding: 20, paddingBottom: 30 },
  chatBubble: { maxWidth: '85%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, marginBottom: 14 },
  chatBubbleUser: { alignSelf: 'flex-end', backgroundColor: '#1D4ED8', borderBottomRightRadius: 4 },
  chatBubbleModel: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  chatText: { fontSize: 15, lineHeight: 22 },
  chatTextUser: { color: '#FFFFFF', fontWeight: '500' },
  chatTextModel: { color: '#334155' },
  
  chatInputContainer: { flexDirection: 'row', padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', alignItems: 'center' },
  chatInput: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, marginRight: 12, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0' },
  chatSendBtn: { backgroundColor: '#1D4ED8', width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' }
});