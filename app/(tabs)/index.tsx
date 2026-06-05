import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Unsubscribe,
  updateDoc,
  doc,
  increment,
  setDoc,
  getDoc
} from "firebase/firestore";
import React, { useEffect, useState, useRef} from 'react';
import {
  Alert,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Button,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';

interface Team {
  id: string;
  name: string;
  description: string;
  maxMembers?: number;
  currentMembers?: number;
  totalDistance?: number;
  rank?: number;
  matchCount?: number; 
  vector?: number[];   
  desiredTeamType?: string;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
  senderName?: string;
  senderPhotoURL?: string; 
}

const TIME_SLOTS = [
  "새벽 12시 ~ 오전 8시",
  "오전 8시 ~ 점심 12시",
  "점심 12시 ~ 오후 4시",
  "오후 4시 ~ 저녁 8시",
  "저녁 8시 ~ 밤 12시"
];

const DAYS_OF_WEEK = ["월", "화", "수", "목", "금", "토", "일"];

export default function App() {
  const flatListRef = useRef<FlatList>(null);
  const [activeTab, setActiveTab] = useState('홈');
  const [viewMode, setViewMode] = useState<'main' | 'create' | 'join'>('main');
  const [joinedTeam, setJoinedTeam] = useState<Team | null>(null);
  
  // 공통 기본 정보 입력 상태
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  
  // 💡 [새 팀 만들기] 전용 입력 상태 (새로운 주관식 문항 추가)
  const [createTimeSlot, setCreateTimeSlot] = useState<number | null>(null);
  const [createPace, setCreatePace] = useState('');
  const [createDist, setCreateDist] = useState('');
  const [createDays, setCreateDays] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [createTeamType, setCreateTeamType] = useState(''); 

  // 💡 [팀 가입하기] 전용 필수 입력 상태 (새로운 주관식 문항 추가)
  const [joinUserTimeSlot, setJoinUserTimeSlot] = useState<number | null>(null);
  const [joinUserPace, setJoinUserPace] = useState('');
  const [joinUserDist, setJoinUserDist] = useState('');
  const [joinUserDays, setJoinUserDays] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [joinUserTeamType, setJoinUserTeamType] = useState(''); 
  const [isJoinPrefFilled, setIsJoinPrefFilled] = useState(false);

  const [teams, setTeams] = useState<Team[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');

  // 매칭에 사용되는 최종 백터 구조: [시간슬롯인덱스(0~4), 페이스, 거리, 월(0/1), 화(0/1), ... 일(0/1)]
  const [myMetrics, setMyMetrics] = useState<number[]>([0, 5.5, 10, 1, 0, 1, 0, 1, 0, 0]);

  const teamQuote = "#함께 달리면 더 멀리!";

  // 요일 토글 헬퍼 함수
  const toggleDayItem = (targetArray: number[], setTargetArray: React.Dispatch<React.SetStateAction<number[]>>, index: number) => {
    const updated = [...targetArray];
    updated[index] = updated[index] === 1 ? 0 : 1;
    setTargetArray(updated);
  };

  const generateDummyTeams = () => {
    const dummy: Team[] = [];
    for (let i = 1; i <= 100; i++) {
      dummy.push({
        id: `dummy_team_${i}`,
        name: `🏃‍♂️ 스피드 레이서 ${i}호 크루`,
        description: `이번 주 7일 목표 함께 채우실 분 구합니다!`,
        desiredTeamType: "활발하고 파이팅 넘치는 팀",
        maxMembers: 5,
        currentMembers: Math.floor(Math.random() * 4) + 1,
        totalDistance: Math.floor(Math.random() * 200) + 5,
        vector: [
          Math.floor(Math.random() * 5), 
          parseFloat((Math.random() * (7.5 - 4.5) + 4.5).toFixed(1)), 
          Math.floor(Math.random() * (20 - 3) + 3),
          Math.random() > 0.5 ? 1 : 0,
          Math.random() > 0.5 ? 1 : 0,
          Math.random() > 0.5 ? 1 : 0,
          Math.random() > 0.5 ? 1 : 0,
          Math.random() > 0.5 ? 1 : 0,
          Math.random() > 0.5 ? 1 : 0,
          Math.random() > 0.5 ? 1 : 0
        ]
      });
    }
    return dummy;
  };

  // 💡 핵심 알고리즘: 주관식 답변은 제외하고, 선택한 시간대와 요일이 "다를수록" 퍼센트 상승
  const calculateMatchPct = (userVec: number[], teamVec: number[]) => {
    const userTime = userVec[0];
    const teamTime = teamVec[0];

    // 1. 시간대가 다르면 차이값 증가 (같으면 0, 다르면 1)
    const timeDiff = userTime === teamTime ? 0 : 1; 
    
    // 2. 활동 요일이 서로 다를수록 차이값 증가
    let dayDiffCount = 0;
    for (let i = 3; i < 10; i++) {
      if (userVec[i] !== (teamVec[i] || 0)) {
        dayDiffCount++;
      }
    }
    const dayDiffNormalized = dayDiffCount / 7; // 0 ~ 1 사이로 정규화

    // 시간대(40%)와 요일(60%) 차이를 종합 반영 (다를수록 값이 커짐)
    const totalDifference = (timeDiff * 0.4) + (dayDiffNormalized * 0.6);

    // 차이가 클수록 높은 점수 부여 (기본 70%에서 최대 99%까지 다를수록 매칭률 상승)
    const score = 70 + Math.round(totalDifference * 29);

    return Math.max(70, Math.min(99, score));
  };

  useEffect(() => {
    if (!auth.currentUser) return;
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (userSnap) => {
      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        const timeSlot = userData.timeSlot ?? 0;
        const pace = userData.pace || 5.5;
        const dist = userData.targetDistance || 10;
        const days = userData.activeDays || [1, 0, 1, 0, 1, 0, 0];
        
        const loadedVector = [timeSlot, pace, dist, ...days];
        setMyMetrics(loadedVector);

        // 팀 가입창 정보 초기동기화 프리필
        setJoinUserTimeSlot(timeSlot);
        setJoinUserPace(pace.toString());
        setJoinUserDist(dist.toString());
        setJoinUserDays(days);

        if (userData.joinedTeamId) {
          setJoinedTeam({
            id: userData.joinedTeamId,
            name: userData.teamName || "내 러닝 팀",
            description: "",
            totalDistance: 326.45,
            rank: 3
          });
        } else {
          setJoinedTeam(null);
        }
      }
    });
    return () => unsubscribeUser();
  }, []);

  useEffect(() => {
    let unsubTeam: Unsubscribe | undefined;
    if (joinedTeam?.id) {
      const teamDocRef = doc(db, "teams", joinedTeam.id);
      unsubTeam = onSnapshot(teamDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const teamData = docSnap.data();
          setJoinedTeam(prev => prev ? {
            ...prev,
            name: teamData.name || prev.name,
            description: teamData.description || "", 
            currentMembers: teamData.currentMembers ?? 0,
            totalDistance: teamData.totalDistance || 0,
            rank: teamData.rank || 1
          } : null);
        }
      });
    }
    return () => { if (unsubTeam) unsubTeam(); };
  }, [joinedTeam?.id]);

  // 팀 가입 목록 조회 및 정렬 리스너
  useEffect(() => {
    let unsubTeams: Unsubscribe | undefined;
    if (viewMode === 'join' && isJoinPrefFilled) {
      const q = query(collection(db, "teams"), orderBy("createdAt", "desc"));
      unsubTeams = onSnapshot(q, (snapshot) => {
        let fetchedTeams = snapshot.docs.map(doc => {
          const data = doc.data();
          return { 
            id: doc.id, 
            ...data,
            vector: data.vector || [0, 5.5, 10, 1, 0, 1, 0, 1, 0, 0] 
          } as Team;
        });

        if (fetchedTeams.length === 0) {
          fetchedTeams = generateDummyTeams();
        }

        const ratedTeams = fetchedTeams.map(team => ({
          ...team,
          matchCount: calculateMatchPct(myMetrics, team.vector || [0, 5.5, 10, 1, 0, 1, 0, 1, 0, 0])
        }));

        // 💡 서로 다를수록 높은 일치 비율을 가진 팀이 최상단에 뜨도록 실시간 정렬
        ratedTeams.sort((a, b) => (b.matchCount || 0) - (a.matchCount || 0));
        setTeams(ratedTeams);
      });
    }
    return () => { if (unsubTeams) unsubTeams(); };
  }, [viewMode, myMetrics, isJoinPrefFilled]);

  useEffect(() => {
    let unsub: Unsubscribe | undefined;
    if (auth.currentUser && joinedTeam?.id && activeTab === '홈') {
      const q = query(collection(db, "teams", joinedTeam.id, "messages"), orderBy("createdAt", "asc"));
      unsub = onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
      });
    }
    return () => { if (unsub) unsub(); };
  }, [joinedTeam?.id, activeTab]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !auth.currentUser || !joinedTeam?.id) return;
    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userDocRef);
      const userData = userSnap.data();

      await addDoc(collection(db, "teams", joinedTeam.id, "messages"), {
        text: inputText,
        createdAt: serverTimestamp(),
        senderId: auth.currentUser.uid,
        senderName: userData?.nickname || auth.currentUser.email,
        senderPhotoURL: userData?.photoURL || null,
      });
      setInputText('');
    } catch (e) { 
      Alert.alert("오류", "메시지 전송 실패"); 
    }
  };

  const emoticons = ['🏃‍♂️', '🏃‍♀️', '🔥', '👟', '💦', '💪', '🥇', '👏', '🎉', '🤝'];

  const handleSendEmoticon = async (emoji: string) => {
    if (!auth.currentUser || !joinedTeam?.id) return;
    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userDocRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      await addDoc(collection(db, "teams", joinedTeam.id, "messages"), {
        text: emoji,
        createdAt: serverTimestamp(),
        senderId: auth.currentUser.uid,
        senderName: userData.nickname || auth.currentUser.email,
        senderPhotoURL: userData.photoURL || null,
      });
    } catch (e) { 
      Alert.alert("오류", "이모티콘 전송 실패"); 
    }
  };

  // 💡 새 팀 만들기 제출 처리 (새 질문 검증 포함)
  const handleCreateTeam = async () => {
    const paceNum = parseFloat(createPace);
    const distNum = parseFloat(createDist);
    const hasSelectedDay = createDays.includes(1);

    if (
      !teamName.trim() || 
      !teamDescription.trim() || 
      createTimeSlot === null || 
      !createPace.trim() || 
      !createDist.trim() || 
      !hasSelectedDay ||
      !createTeamType.trim() // 새 주관식 칸 빈값 검증
    ) {
      Alert.alert("작성 실패", "모든 칸을 빼놓지 말고 지정해주셔야 팀 생성이 완료됩니다!");
      return;
    }

    if (isNaN(paceNum) || isNaN(distNum)) {
      Alert.alert("입력 오류", "페이스와 거리는 숫자 형식만 유효합니다.");
      return;
    }

    try {
      const generatedVector = [createTimeSlot, paceNum, distNum, ...createDays];

      const newTeamRef = await addDoc(collection(db, "teams"), {
        name: teamName,
        description: teamDescription,
        desiredTeamType: createTeamType, // 주관식 데이터 저장 (매칭 연산엔 제외)
        maxMembers: 5,
        currentMembers: 1,
        totalDistance: 0,
        createdAt: serverTimestamp(),
        batonHolder: null,        
        batonHolderName: "",
        batonExpiryTime: 172800,
        vector: generatedVector 
      });

      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userDocRef, {
        joinedTeamId: newTeamRef.id,
        teamName: teamName
      }, { merge: true });

      const userEmail = auth.currentUser.email || "알 수 없는 사용자";
      await addDoc(collection(db, "teams", newTeamRef.id, "messages"), {
        text: `📢 ${userEmail} 님이 팀을 생성하고 합류했습니다.`,
        createdAt: serverTimestamp(),
        senderId: "system",
        senderName: "시스템"
      });

      Alert.alert("성공", "새로운 맞춤형 성향 크루가 개설되었습니다!");
      setTeamName(''); 
      setTeamDescription('');
      setCreateTimeSlot(null);
      setCreatePace('');
      setCreateDist('');
      setCreateDays([0,0,0,0,0,0,0]);
      setCreateTeamType('');
      setViewMode('main');
    } catch (e) { Alert.alert("오류", "생성 실패"); }
  };

  // 💡 팀 가입하기 사전 필수 기입 검증 (새 질문 검증 포함)
  const handleVerifyAndProceedJoin = () => {
    const paceNum = parseFloat(joinUserPace);
    const distNum = parseFloat(joinUserDist);
    const hasSelectedDay = joinUserDays.includes(1);

    if (
      joinUserTimeSlot === null || 
      !joinUserPace.trim() || 
      !joinUserDist.trim() || 
      !hasSelectedDay || 
      !joinUserTeamType.trim() // 새 주관식 칸 빈값 검증
    ) {
      Alert.alert("알림", "모든 칸을 채워주셔야 가입 가능한 매칭 리스트가 조회됩니다.");
      return;
    }

    if (isNaN(paceNum) || isNaN(distNum)) {
      Alert.alert("오류", "러닝 정보 단위 양식은 숫자로만 채워주세요.");
      return;
    }

    // 최종 유저 매칭 기준치 정보 갱신
    setMyMetrics([joinUserTimeSlot, paceNum, distNum, ...joinUserDays]);
    setIsJoinPrefFilled(true);
  };

  const handleJoinAction = async (selectedTeam: Team) => {
    if (!auth.currentUser) return;
    const currentCount = selectedTeam.currentMembers ?? 0;
    const maxCount = selectedTeam.maxMembers || 5;
    
    if (currentCount >= maxCount) {
      Alert.alert("가입 불가", "이미 정원이 꽉 찬 팀입니다. (최대 5명)");
      return;
    }

    try {
      const teamDocRef = doc(db, "teams", selectedTeam.id);
      await updateDoc(teamDocRef, { currentMembers: increment(1) });

      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userDocRef, {
        joinedTeamId: selectedTeam.id,
        teamName: selectedTeam.name
      }, { merge: true });

      const userEmail = auth.currentUser.email || "알 수 없는 사용자";
      await addDoc(collection(db, "teams", selectedTeam.id, "messages"), {
        text: `🎉 ${userEmail} 님이 팀에 합류했습니다!`,
        createdAt: serverTimestamp(),
        senderId: "system",
        senderName: "시스템"
      });

      setJoinedTeam({ ...selectedTeam, currentMembers: currentCount + 1 });
      setViewMode('main');
      setActiveTab('홈');
      setIsJoinPrefFilled(false); 
      setJoinUserTeamType('');
      Alert.alert("가입 성공", `🎉 ${selectedTeam.name} 팀에 합류했습니다!`);
    } catch (error) {
      console.error("팀 가입 오류:", error);
      Alert.alert("오류", "팀 가입 처리에 실패했습니다.");
    }
  };

  const handleExitTeam = async () => {
    if (!auth.currentUser || !joinedTeam) return;
    Alert.alert("팀 나가기", "정말 팀을 나가시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "나가기",
        style: "destructive",
        onPress: async () => {
          try {
            const teamId = joinedTeam.id;
            const userEmail = auth.currentUser?.email || "알 수 없는 사용자";
            const teamDocRef = doc(db, "teams", teamId);

            const userDocRef = doc(db, "users", auth.currentUser!.uid);
            await setDoc(userDocRef, { joinedTeamId: null, teamName: null }, { merge: true });

            await addDoc(collection(db, "teams", teamId, "messages"), {
              text: `🏃‍♂️ ${userEmail} 님이 팀에서 퇴장하셨습니다.`,
              createdAt: serverTimestamp(),
              senderId: "system",
              senderName: "시스템"
            });

            const teamSnap = await getDoc(teamDocRef);
            if (teamSnap.exists()) {
              const currentTotalMembers = teamSnap.data().currentMembers ?? 1;
              if (currentTotalMembers <= 1) {
                await updateDoc(teamDocRef, { currentMembers: 0 });
              } else {
                await updateDoc(teamDocRef, { currentMembers: increment(-1) });
              }
            }
            setJoinedTeam(null);
            setMessages([]);
            Alert.alert("알림", "팀에서 퇴장하였습니다.");
          } catch (e) {
            console.error(e);
            Alert.alert("오류", "팀 나가기 처리에 실패했습니다.");
          }
        }
      }
    ]);
  };

  const renderContent = () => {
    let currentRank = joinedTeam?.rank ?? '-';
    if (joinedTeam && typeof teams !== 'undefined' && teams.length > 0) {
      const sortedTeams = [...teams].sort((a, b) => (b.totalDistance || 0) - (a.totalDistance || 0));
      const myTeamIndex = sortedTeams.findIndex(t => t.id === joinedTeam.id);
      if (myTeamIndex !== -1) {
        currentRank = myTeamIndex + 1;
      }
    }

    if (activeTab !== '홈') {
      return (
        <View style={styles.center}>
          <Text>{activeTab} 페이지</Text>
        </View>
      );
    }
  
    if (activeTab === '홈') {
      if (joinedTeam) {
        return (
          <ImageBackground 
            source={require('../../assets/images/chat-bg.png')} 
            style={[styles.chatContainer, { paddingTop: 18, flex: 1 }]} 
            imageStyle={{ top: -35, height: '90%' }} 
            resizeMode="cover"
          >
            <KeyboardAvoidingView 
              style={{ flex: 1 }} 
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={0}
            >
              <View style={{ height: 65 }} />
              <View style={styles.teamCard}>
                <View style={styles.teamHeaderRow}>
                  <Image 
                    source={require('../../assets/images/logo.png')} 
                    style={styles.teamLogoImage} 
                    resizeMode="cover"
                  />
                  <View style={styles.teamTextContainer}>
                    <View style={styles.teamNameRow}>
                      <Text style={styles.teamName}>{joinedTeam.name}</Text>
                      <View style={styles.publicBadge}>
                        <Text style={styles.publicBadgeText}>공개팀</Text>
                      </View>
                    </View>
                    <Text style={styles.teamQuote}>{teamQuote}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.teamInfoBtn}
                    onPress={() => {
                      Alert.alert(
                        `${joinedTeam.name} 정보`, 
                        joinedTeam.description || "등록된 팀 소개가 없습니다."
                      );
                    }}
                  >
                    <Text style={styles.teamInfoBtnText}>팀 정보 &gt;</Text>
                  </TouchableOpacity>
                </View>
  
                <View style={styles.teamStatsRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="people" size={14} color="#555" style={styles.statIcon} />
                    <Text style={styles.statTextBold}>{joinedTeam.currentMembers}</Text>
                    <Text style={styles.statText}>/{joinedTeam.maxMembers ?? 5}명</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Ionicons name="walk" size={14} color="#007AFF" style={styles.statIcon} />
                    <Text style={styles.statText}>이번달 </Text>
                    <Text style={styles.statTextBold}>{joinedTeam.totalDistance ?? 0}</Text>
                    <Text style={styles.statText}> km</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Ionicons name="trophy" size={14} color="#FF9500" style={styles.statIcon} />
                    <Text style={styles.statText}>팀 랭킹 </Text>
                    <Text style={styles.statTextBold}>{currentRank}</Text>
                    <Text style={styles.statText}>위</Text>
                  </View>
                </View>
              </View>
  
              <View style={{ height: 55 }} /> 
              <FlatList 
                ref={flatListRef}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                style={{ flex: 1 }} 
                data={messages} 
                keyExtractor={(item) => item.id} 
                contentContainerStyle={styles.messageList} 
                renderItem={({ item }) => {
                  const isMine = item.senderId === auth.currentUser?.uid;
                  const isSystem = item.senderId === 'system';
                  
                  if (isSystem) {
                    return (
                      <View style={styles.systemMessageContainer}>
                        <Text style={styles.systemMessageText}>{item.text}</Text>
                      </View>
                    );
                  }
                  
                  return (
                    <View style={[styles.messageRow, isMine ? styles.myRow : styles.otherRow]}>
                      {!isMine && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                          {item.senderPhotoURL ? (
                            <Image 
                              source={{ uri: item.senderPhotoURL }} 
                              style={styles.avatar} 
                            />
                          ) : (
                            <View style={[styles.avatar, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}>
                              <Text style={{ fontSize: 12 }}>👤</Text>
                            </View>
                          )}
                          <Text style={styles.senderName}>{item.senderName || "상대방"}</Text>
                        </View>
                      )}
                      <View style={[styles.messageBubble, isMine ? styles.myBubble : styles.otherBubble]}>
                        <Text style={[styles.messageText, isMine ? styles.myText : styles.otherText]}>{item.text}</Text>
                      </View>
                    </View>
                  );
                }} 
              />
              
              <View style={styles.emoticonContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {emoticons.map((emoji, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.emoticonBtn} 
                      onPress={() => handleSendEmoticon(emoji)}
                    >
                      <Text style={styles.emoticonText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
  
              <View style={styles.inputContainer}>
                <TextInput 
                  style={styles.chatInput} 
                  placeholder="메시지 입력..." 
                  value={inputText} 
                  onChangeText={setInputText} 
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                  <Text style={styles.sendButtonText}>전송</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity style={styles.exitButton} onPress={handleExitTeam}>
                <Text style={styles.exitButtonText}>팀 나가기</Text>
              </TouchableOpacity>
            </KeyboardAvoidingView> 
          </ImageBackground>
        );
      }
      
      // 💡 [새 팀 만들기] 렌더링 뷰 (주관식 질문 신설 반영)
      if (viewMode === 'create') {
        return (
          <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.headerTitle}>새 팀 만들기</Text>
            
            <Text style={styles.formLabel}>팀 이름 *</Text>
            <TextInput style={styles.input} placeholder="팀 이름을 입력하세요" value={teamName} onChangeText={setTeamName} />
            
            <Text style={styles.formLabel}>팀 소개 *</Text>
            <TextInput style={[styles.input, styles.textArea]} placeholder="우리 크루만의 목표 규칙을 작성해 주세요" value={teamDescription} onChangeText={setTeamDescription} multiline />
            
            <Text style={styles.formLabel}>선호 활동 시간대 지정 *</Text>
            {TIME_SLOTS.map((slot, idx) => (
              <TouchableOpacity 
                key={idx}
                style={[styles.slotOptionRow, createTimeSlot === idx && styles.activeSlotRow]}
                onPress={() => setCreateTimeSlot(idx)}
              >
                <Ionicons name={createTimeSlot === idx ? "radio-button-on" : "radio-button-off"} size={18} color={createTimeSlot === idx ? "#fff" : "#6b7280"} />
                <Text style={[styles.slotOptionText, createTimeSlot === idx && styles.activeSlotText]}>{slot}</Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.formLabel}>주요 주 활동 요일 선택 (중복 선택 가능) *</Text>
            <View style={styles.daysRowContainer}>
              {DAYS_OF_WEEK.map((day, idx) => {
                const isSelected = createDays[idx] === 1;
                return (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.dayCircleBox, isSelected && styles.activeDayCircle]} 
                    onPress={() => toggleDayItem(createDays, setCreateDays, idx)}
                  >
                    <Text style={[styles.dayCircleText, isSelected && styles.activeDayText]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.formLabel}>목표 러닝 페이스 (분/km) *</Text>
            <TextInput style={styles.input} placeholder="예: 5.5" value={createPace} onChangeText={setCreatePace} keyboardType="numeric" />

            <Text style={styles.formLabel}>목표 러닝 거리 (km) *</Text>
            <TextInput style={styles.input} placeholder="예: 10" value={createDist} onChangeText={setCreateDist} keyboardType="numeric" />

            {/* 💡 새로 추가된 주관식 칸 */}
            <Text style={styles.formLabel}>본인이 원하는 팀 유형 (ex. 활발한 등) 을 구체적으로 작성해주세요. *</Text>
            <TextInput 
              style={[styles.input, styles.textArea]} 
              placeholder="예시: 소외되는 사람 없이 다 같이 으쌰으쌰하며 활발하게 달리는 분위기의 팀을 원합니다." 
              value={createTeamType} 
              onChangeText={setCreateTeamType} 
              multiline 
            />

            <View style={[styles.buttonRow, { marginTop: 25 }]}>
              <TouchableOpacity style={[styles.formButton, { backgroundColor: '#999' }]} onPress={() => setViewMode('main')}>
                <Text style={styles.formButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formButton, { backgroundColor: '#3b82f6' }]} onPress={handleCreateTeam}>
                <Text style={styles.formButtonText}>팀 생성완료</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );
      }
  
      // 💡 [팀 가입하기] 렌더링 뷰 (사전 성향 입력창에 주관식 질문 신설 반영)
      if (viewMode === 'join') {
        if (!isJoinPrefFilled) {
          return (
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.headerTitle}>🔒 매칭 성향 기입 필요</Text>
              <Text style={styles.helperFormDesc}>본인에게 꼭 맞는 매칭 정렬 결과를 도출하기 위해 주 활동 성향 파악 작성이 선행되어야 가입 페이지가 활성화됩니다.</Text>
              
              <Text style={styles.formLabel}>본인의 주 러닝 활성화 시간대 *</Text>
              {TIME_SLOTS.map((slot, idx) => (
                <TouchableOpacity 
                  key={idx}
                  style={[styles.slotOptionRow, joinUserTimeSlot === idx && styles.activeSlotRow]}
                  onPress={() => setJoinUserTimeSlot(idx)}
                >
                  <Ionicons name={joinUserTimeSlot === idx ? "radio-button-on" : "radio-button-off"} size={18} color={joinUserTimeSlot === idx ? "#fff" : "#6b7280"} />
                  <Text style={[styles.slotOptionText, joinUserTimeSlot === idx && styles.activeSlotText]}>{slot}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.formLabel}>본인의 주 활동 요일 설정 *</Text>
              <View style={styles.daysRowContainer}>
                {DAYS_OF_WEEK.map((day, idx) => {
                  const isSelected = joinUserDays[idx] === 1;
                  return (
                    <TouchableOpacity 
                      key={idx} 
                      style={[styles.dayCircleBox, isSelected && styles.activeDayCircle]} 
                      onPress={() => toggleDayItem(joinUserDays, setJoinUserDays, idx)}
                    >
                      <Text style={[styles.dayCircleText, isSelected && styles.activeDayText]}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.formLabel}>본인의 평균 러닝 페이스 (분/km) *</Text>
              <TextInput style={styles.input} placeholder="예: 5.5" value={joinUserPace} onChangeText={setJoinUserPace} keyboardType="numeric" />

              <Text style={styles.formLabel}>본인의 1회당 목표 운동 거리 (km) *</Text>
              <TextInput style={styles.input} placeholder="예: 8" value={joinUserDist} onChangeText={setJoinUserDist} keyboardType="numeric" />

              {/* 💡 새로 추가된 주관식 칸 */}
              <Text style={styles.formLabel}>본인이 원하는 팀 유형 (ex. 활발한 등) 을 구체적으로 작성해주세요. *</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="예시: 주말 아침마다 서로 피드백을 주고받으며 열정적으로 성장하는 크루 유형이 좋습니다." 
                value={joinUserTeamType} 
                onChangeText={setJoinUserTeamType} 
                multiline 
              />

              <TouchableOpacity style={styles.submitPrefBtn} onPress={handleVerifyAndProceedJoin}>
                <Text style={styles.submitPrefBtnText}>작성 완료 및 맞춤 팀 탐색</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.backButton, { backgroundColor: '#777', marginTop: 12 }]} onPress={() => setViewMode('main')}>
                 <Text style={{color:'#fff', fontWeight: 'bold'}}>메인으로 돌아가기</Text>
              </TouchableOpacity>
            </ScrollView>
          );
        }

        // 성향 조건 제출 완수 시 비로소 나오는 가입 타겟 리스트 목록 화면
        return (
          <View style={styles.container}>
            <Text style={styles.headerTitle}>🏃‍♂️ 내 맞춤형 추천 크루 리스트</Text>
            <Text style={{ fontSize: 13, color: '#4f46e5', textAlign: 'center', marginBottom: 10, fontWeight: '600' }}>
              💡 내가 설정한 시간대 및 요일과 서로 다른 팀일수록 매칭률이 높아집니다!
            </Text>

            <FlatList
              data={teams}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.teamListItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTeamName}>{item.name}</Text>
                    <Text style={styles.listTeamDesc}>{item.description}</Text>
                    {item.desiredTeamType ? (
                      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4, fontStyle: 'italic' }}>
                        🎯 희망 유형: "{item.desiredTeamType}"
                      </Text>
                    ) : null}
                    <Text style={{ fontSize: 13, color: '#3b82f6', marginTop: 4, fontWeight: '600' }}>
                      👤 정원수: {item.currentMembers ?? 0} / {item.maxMembers || 5}명
                    </Text>
                  </View>
                  
                  <View style={{ alignItems: 'center', marginRight: 10, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#10b981', marginBottom: 4 }}>
                      {item.matchCount}% 일치
                    </Text>
                    <TouchableOpacity style={styles.joinActionBtn} onPress={() => handleJoinAction(item)}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>참여하기</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
            
            <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: 10}}>
              <TouchableOpacity style={[styles.backButton, { flex: 1, backgroundColor: '#666' }]} onPress={() => setIsJoinPrefFilled(false)}>
                 <Text style={{color:'#fff', fontWeight:'bold'}}>성향 재입력</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.backButton, { flex: 1 }]} onPress={() => setViewMode('main')}>
                 <Text style={{color:'#fff', fontWeight:'bold'}}>메인으로</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }
  
      return (
        <ScrollView style={styles.whiteContainer} bounces={false}>
          <ImageBackground source={require('../../assets/images/background.png')} style={styles.mainBanner}>
            <View style={styles.topProfileBar}>
              <Text style={styles.bellIcon}>🔔</Text>
            </View>
          </ImageBackground>
          <View style={styles.contentPadding}>
            <Text style={styles.whiteContainer ? styles.mainTitle : styles.mainTitle}>아직 소속된 팀이 없네요!</Text>
            <Text style={styles.subTitle}>러닝 팀에 가입하거나 직접 만들어 함께 달려보세요.</Text>
            <TouchableOpacity style={styles.actionCard} onPress={() => setViewMode('create')}>
              <View style={[styles.iconBox, { backgroundColor: '#E1F0FF' }]}><Ionicons name="add-circle" size={32} color="#3B82F6" /></View>
              <View style={styles.cardTextContainer}><Text style={styles.cardTitle}>팀 생성하기</Text><Text style={styles.cardDesc}>새로운 러닝 크루를 시작하세요</Text></View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => setViewMode('join')}>
              <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}><Ionicons name="search" size={32} color="#22C55E" /></View>
              <View style={styles.cardTextContainer}><Text style={styles.cardTitle}>팀 가입하기</Text><Text style={styles.cardDesc}>활동 중인 팀을 찾아보세요</Text></View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }
    
    return <View style={styles.center}><Text>{activeTab} 페이지</Text></View>;
  };
  
  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={{ flex: 1 }}>{renderContent()}</View>
    </View>
  );
}
  
const styles = StyleSheet.create({
  container: { flex: 1, padding: 40, backgroundColor: '#fff' },
  whiteContainer: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', marginTop: 20, color: '#1e293b' },
  helperFormDesc: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  topProfileBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40 },
  bellIcon: { marginLeft: 'auto', fontSize: 22 },
  mainBanner: { width: '100%', height: 700, resizeMode: 'cover' },
  contentPadding: { padding: 20, marginTop: -300 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 14, marginBottom: 15, color: '#333', backgroundColor: '#fdfdfd' },
  textArea: { height: 80, textAlignVertical: 'top' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around' },
  teamListItem: { 
    flexDirection: 'row', 
    paddingVertical: 20,          
    borderBottomWidth: 1, 
    borderBottomColor: '#eee', 
    alignItems: 'center' 
  },
  listTeamName: { fontSize: 18, fontWeight: 'bold', color: '#334155' },
  listTeamDesc: { color: '#64748b', marginTop: 4, fontSize: 13 },
  joinActionBtn: { backgroundColor: '#7ca1de', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  backButton: { backgroundColor: '#333', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  chatContainer: { flex: 1, backgroundColor: '#f9f9f9' },
  mainTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  subTitle: { fontSize: 14, color: '#64748B', marginBottom: 24 },
  actionCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5 },
  iconBox: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#94A3B8' },
  teamCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 8,     
    borderRadius: 20,
    paddingVertical: 22,  
    marginTop: 23, 
    paddingHorizontal: 22, 
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  teamHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  teamLogoImage: { width: 80, height: 80, borderRadius: 16, marginRight: 15, backgroundColor: '#fff' },
  teamTextContainer: { flex: 1, justifyContent: 'center' },
  teamNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  teamName: { fontSize: 21, fontWeight: '900', color: '#111', marginRight: 8 },
  publicBadge: { backgroundColor: '#3B82F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  publicBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  teamQuote: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  teamInfoBtn: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  teamInfoBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  teamStatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statIcon: { marginRight: 4 },
  statText: { fontSize: 14, color: '#4B5563' },
  statTextBold: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  statDivider: { width: 1, height: 14, backgroundColor: '#D1D5DB' },
  emoticonContainer: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', paddingVertical: 8, paddingHorizontal: 10 },
  emoticonBtn: { paddingHorizontal: 10, paddingVertical: 5, marginRight: 5, backgroundColor: '#f8fafc', borderRadius: 15 },
  emoticonText: { fontSize: 24 },
  messageList: { paddingHorizontal: 25, paddingVertical: 10 },
  messageRow: { marginVertical: 5 },
  myRow: { alignItems: 'flex-end' },
  otherRow: { alignItems: 'flex-start' },
  messageBubble: { padding: 8, borderRadius: 15, maxWidth: '80%' },
  myBubble: { backgroundColor: '#3b82f6' },
  otherBubble: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0' },
  messageText: { fontSize: 13 },
  myText: { color: '#fff' },
  otherText: { color: '#333' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  chatInput: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10 },
  sendButton: { backgroundColor: '#3b82f6', borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center' },
  sendButtonText: { color: '#fff', fontWeight: 'bold' },
  systemMessageContainer: { alignSelf: 'center', backgroundColor: '#e2e8f0', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, marginVertical: 10 },
  systemMessageText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  senderName: { fontSize: 12, color: '#666', marginBottom: 2, marginLeft: 5 },
  exitButton: { backgroundColor: '#f87171', padding: 12, marginHorizontal: 10, marginBottom: 10, borderRadius: 8, alignItems: 'center' },
  exitButtonText: { color: '#fff', fontWeight: 'bold' },
  avatar: { width: 24, height: 24, borderRadius: 12, marginRight: 6 },
  
  formLabel: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 8, marginTop: 16 },
  slotOptionRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginBottom: 6, backgroundColor: '#f8fafc' },
  activeSlotRow: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  slotOptionText: { marginLeft: 10, fontSize: 14, color: '#475569', fontWeight: '500' },
  activeSlotText: { color: '#fff', fontWeight: '700' },
  daysRowContainer: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5 },
  dayCircleBox: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1' },
  activeDayCircle: { backgroundColor: '#10b981', borderColor: '#10b981' },
  dayCircleText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  activeDayText: { color: '#fff', fontWeight: '700' },
  formButton: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  formButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  submitPrefBtn: { backgroundColor: '#10b981', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 25 },
  submitPrefBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});