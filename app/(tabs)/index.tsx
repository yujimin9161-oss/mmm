import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Unsubscribe
} from "firebase/firestore";
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

// 1. 데이터 타입 정의
interface Team {
  id: string;
  name: string;
  description: string;
  maxMembers?: number;
  currentMembers?: number;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
}

export default function App() {
  // [제거] isLoggedIn 상태와 관련 로직을 삭제했습니다.
  const [activeTab, setActiveTab] = useState('홈');
  const [viewMode, setViewMode] = useState<'main' | 'create' | 'join'>('main');
  const [joinedTeam, setJoinedTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    let unsub: Unsubscribe | undefined;
    // auth.currentUser가 존재할 때만 리스너 작동
    if (auth.currentUser && joinedTeam && joinedTeam.id && activeTab === '홈') {
      try {
        const q = query(
          collection(db, "teams", joinedTeam.id, "messages"),
          orderBy("createdAt", "asc")
        );
        unsub = onSnapshot(q, (snapshot) => {
          const loadedMessages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Message));
          setMessages(loadedMessages);
        });
      } catch (err) {
        console.error("리스너 오류:", err);
      }
    }
    return () => { if (unsub) unsub(); };
  }, [joinedTeam, activeTab]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !auth.currentUser || !joinedTeam?.id) return;
    try {
      await addDoc(collection(db, "teams", joinedTeam.id, "messages"), {
        text: inputText,
        createdAt: serverTimestamp(),
        senderId: auth.currentUser.uid, 
      });
      setInputText('');
    } catch (e) { Alert.alert("오류", "메시지 전송 실패"); }
  };

  const fetchTeams = async () => {
    try {
      const q = query(collection(db, "teams"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedTeams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(fetchedTeams);
      setViewMode('join');
    } catch (e) { Alert.alert("오류", "목록 불러오기 실패"); }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim() || !teamDescription.trim()) {
      Alert.alert("알림", "모든 항목을 입력해주세요.");
      return;
    }
    try {
      await addDoc(collection(db, "teams"), {
        name: teamName,
        description: teamDescription,
        maxMembers: 5,
        currentMembers: 1,
        totalDistance: 0,
        createdAt: serverTimestamp(),
      });
      Alert.alert("성공", "팀이 생성되었습니다.");
      setTeamName(''); setTeamDescription('');
      setViewMode('main');
    } catch (e) { Alert.alert("오류", "생성 실패"); }
  };

  const handleJoinAction = (selectedTeam: Team) => {
    setJoinedTeam(selectedTeam);
    setViewMode('main');
    setActiveTab('홈');
  };

  const renderContent = () => {
    if (activeTab === '홈') {
      if (joinedTeam) {
        return (
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          >
            <Text style={styles.headerTitle}>💬 {joinedTeam.name} 채팅방</Text>
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isMine = item.senderId === auth.currentUser?.uid;
                return (
                  <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.otherMessage]}>
                    <Text style={[styles.messageText, isMine && { color: '#fff' }]}>{item.text}</Text>
                  </View>
                );
              }}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 10 }}
            />
            <View style={styles.inputRow}>
              <TextInput style={styles.chatInput} placeholder="메시지 입력..." value={inputText} onChangeText={setInputText} />
              <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                <Text style={{color: '#fff', fontWeight: 'bold'}}>전송</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.exitButton} onPress={() => {setJoinedTeam(null); setMessages([]);}}>
              <Text style={{color: '#fff'}}>팀 나가기</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        );
      }
      
      if (viewMode === 'create') {
        return (
          <View style={styles.container}>
            <Text style={styles.headerTitle}>새 팀 만들기</Text>
            <TextInput style={styles.input} placeholder="팀 이름" value={teamName} onChangeText={setTeamName} />
            <TextInput style={[styles.input, styles.textArea]} placeholder="팀 소개" value={teamDescription} onChangeText={setTeamDescription} multiline />
            <View style={styles.buttonRow}>
              <Button title="취소" onPress={() => setViewMode('main')} color="#999" />
              <Button title="생성하기" onPress={handleCreateTeam} />
            </View>
          </View>
        );
      }

      if (viewMode === 'join') {
        return (
          <View style={styles.container}>
            <Text style={styles.headerTitle}>가입 가능한 팀</Text>
            <FlatList
              data={teams}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.teamListItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTeamName}>{item.name}</Text>
                    <Text style={styles.listTeamDesc}>{item.description}</Text>
                  </View>
                  <TouchableOpacity style={styles.joinActionBtn} onPress={() => handleJoinAction(item)}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>참여하기</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            <TouchableOpacity style={styles.backButton} onPress={() => setViewMode('main')}>
               <Text style={{color:'#fff'}}>뒤로가기</Text>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <ScrollView style={styles.whiteContainer} bounces={false}>
          <ImageBackground 
            source={require('../../assets/images/background.png')} 
            style={styles.mainBanner}
          >
            <View style={styles.topProfileBar}>
              <View style={styles.profileBox} />
              <View style={styles.profileNameBox} />
              <Text style={styles.bellIcon}>🔔</Text>
            </View>
          </ImageBackground>

          <View style={styles.contentPadding}>
            <Text style={styles.mainInquiry}>함께 달릴 준비가 되셨나요?</Text>
            <TouchableOpacity style={styles.blueLargeButton} onPress={() => setViewMode('create')}>
              <Text style={styles.blueButtonText}>+  팀 생성하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.whiteLargeButton} onPress={fetchTeams}>
              <Text style={styles.whiteButtonText}>🤝  팀 가입하기</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }
    return <View style={styles.center}><Text>{activeTab} 페이지</Text></View>;
  };

  // [수정] 복잡한 조건부 return을 제거하고 바로 메인 UI를 렌더링합니다.
  // 이 화면은 오직 로그인이 완료되었을 때만 _layout.tsx에 의해 노출됩니다.
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1 }}>{renderContent()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  whiteContainer: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', marginTop: 20 },
  topProfileBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
  },
  profileBox: { width: 40, height: 40, backgroundColor: '#4ade80', marginRight: 10 },
  profileNameBox: { width: 80, height: 40, backgroundColor: '#3b82f6' },
  bellIcon: { marginLeft: 'auto', fontSize: 22 },
  mainBanner: { width: '100%', height: 320, resizeMode: 'cover' },
  contentPadding: { padding: 20, marginTop: 10 },
  mainInquiry: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  blueLargeButton: { backgroundColor: '#3b82f6', padding: 25, borderRadius: 15, alignItems: 'center', marginBottom: 15 },
  blueButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  whiteLargeButton: { backgroundColor: '#fff', padding: 25, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#eee', elevation: 3 },
  whiteButtonText: { color: '#3b82f6', fontSize: 20, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 15, marginBottom: 15 },
  textArea: { height: 100, textAlignVertical: 'top' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around' },
  teamListItem: { flexDirection: 'row', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  listTeamName: { fontSize: 18, fontWeight: 'bold' },
  listTeamDesc: { color: '#666', marginTop: 5 },
  joinActionBtn: { backgroundColor: '#3b82f6', padding: 12, borderRadius: 8 },
  backButton: { backgroundColor: '#333', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  messageBubble: { padding: 12, borderRadius: 15, marginBottom: 8, maxWidth: '75%' },
  myMessage: { backgroundColor: '#3b82f6', alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  otherMessage: { backgroundColor: '#f0f0f0', alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  messageText: { fontSize: 16, color: '#000' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  chatInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginRight: 10 },
  sendButton: { backgroundColor: '#3b82f6', padding: 10, borderRadius: 8, justifyContent: 'center' },
  exitButton: { backgroundColor: '#ff4d4d', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 5 }
});