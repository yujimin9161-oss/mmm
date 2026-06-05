import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as geolib from 'geolib';
import { doc, onSnapshot, updateDoc, increment } from "firebase/firestore";
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View, DimensionValue, Platform } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

interface Coord {
  latitude: number;
  longitude: number;
}

interface Team {
  id: string;
  name: string;
  description: string;
}

interface RunningScreenProps {
  joinedTeam: Team | null;
}

export default function RunningScreen({ joinedTeam: propsJoinedTeam }: RunningScreenProps) {
  // --- [사용자 정보 식별] ---
  const MY_USER_ID = auth.currentUser?.uid || "user_lee";
  const MY_NAME = auth.currentUser?.email?.split('@')[0] || "이한별";

  // --- [상태 관리: 실시간 팀 정보 갱신] ---
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);

  // --- [상태 관리: 바통 권한 및 팀 제어 (Firestore 연동)] ---
  const [batonHolder, setBatonHolder] = useState<string | null>(null); 
  const [batonHolderName, setBatonHolderName] = useState<string>(""); 
  const [batonExpiryTime, setBatonExpiryTime] = useState<number>(172800); // 48시간(초)
  
  // --- [상태 관리: 팀 누적 거리 (km 단위)] ---
  const [teamTotalDistance, setTeamTotalDistance] = useState<number>(0); 

  // --- [상태 관리: 러닝 데이터 및 GPS] ---
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<Coord[]>([]);
  const [distance, setDistance] = useState(0); // 현재 달린 거리 (미터)
  const [duration, setDuration] = useState(0); 
  const [pauseTime, setPauseTime] = useState(0); 
  const [lastLocation, setLastLocation] = useState<Coord | null>(null);
  const [currentRegion, setCurrentRegion] = useState<any>(null);

  // --- [타이머 및 구독 Refs] ---
  const timerRef = useRef<any>(null);
  const pauseTimerRef = useRef<any>(null);
  const expiryTimerRef = useRef<any>(null); 
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  // 1️⃣ [내부 조회 로직] 사용자가 가입한 팀 정보를 Firestore에서 실시간으로 가져오기
  useEffect(() => {
    if (!MY_USER_ID) return;

    const userDocRef = doc(db, "users", MY_USER_ID);
    const unsubscribeUser = onSnapshot(userDocRef, (userSnap) => {
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const teamId = userData.joinedTeamId;

        if (teamId) {
          setActiveTeam({
            id: teamId,
            name: userData.teamName || "내 러닝 팀",
            description: ""
          });
        } else {
          setActiveTeam(null);
        }
      }
    }, (error) => {
      console.error("유저 팀 정보 조회 오류:", error);
    });

    if (propsJoinedTeam) {
      setActiveTeam(propsJoinedTeam);
    }

    return () => unsubscribeUser();
  }, [MY_USER_ID, propsJoinedTeam]);

  // 2️⃣ 선택된 실시간 팀(activeTeam)의 바통 및 누적 거리 데이터 실시간 동기화
  useEffect(() => {
    let unsubscribeBaton: () => void;

    if (activeTeam?.id) {
      const teamDocRef = doc(db, "teams", activeTeam.id);
      
      unsubscribeBaton = onSnapshot(teamDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setBatonHolder(data.batonHolder || null);
          setBatonHolderName(data.batonHolderName || "");
          if (data.batonExpiryTime !== undefined) {
            setBatonExpiryTime(data.batonExpiryTime);
          }
          // Firestore에서 팀 전체 누적 거리 가져오기 (없으면 0)
          setTeamTotalDistance(data.totalDistance || 0);
        }
      }, (error) => {
        console.error("팀 상태 구독 오류:", error);
      });
    }

    return () => {
      if (unsubscribeBaton) unsubscribeBaton();
    };
  }, [activeTeam]);

  // 페이스 계산
  const calculatePace = () => {
    if (distance <= 0 || duration <= 0) return "-'--\"";
    const distanceInKm = distance / 1000;
    const paceInSeconds = duration / distanceInKm;
    const minutes = Math.floor(paceInSeconds / 60);
    const seconds = Math.floor(paceInSeconds % 60);
    if (minutes > 59) return "-'--\"";
    return `${minutes}'${String(seconds).padStart(2, '0')}"`;
  };

  // 시간 제한 포맷팅
  const formatExpiryTime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const pad = (num: number) => String(num).padStart(2, '0');
    
    if (days > 0) {
      return `${days}일 ${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
    }
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  };

  // 초기 권한 및 위치 설정
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("권한 오류", "위치 권한이 필요합니다.");
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      const initialPoint = { latitude: location.coords.latitude, longitude: location.coords.longitude };
      setLastLocation(initialPoint);
      setCurrentRegion({ ...initialPoint, latitudeDelta: 0.005, longitudeDelta: 0.005 });
    })();
    
    return () => {
      stopIntervals();
      if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
    };
  }, []);

  const stopIntervals = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);
    if (subscriptionRef.current) subscriptionRef.current.remove();
  };

  // 바통 강제 리셋 및 반납
  const forceResetBaton = async () => {
    stopIntervals();
    if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
    
    setIsRunning(false);
    setIsPaused(false);
    setDistance(0);
    setDuration(0);
    setPauseTime(0);
    setRouteCoordinates([]);
    setLastLocation(null);
    
    if (activeTeam?.id) {
      try {
        const teamDocRef = doc(db, "teams", activeTeam.id);
        await updateDoc(teamDocRef, {
          batonHolder: null,
          batonHolderName: "",
          batonExpiryTime: 172800
        });
      } catch (e) {
        console.error("바통 원격 업데이트 실패:", e);
      }
    }
  };

  // 바통 권한 획득
  const claimBaton = async () => {
    if (!activeTeam?.id) {
      Alert.alert("알림", "가입된 팀 정보가 없습니다.");
      return;
    }
    if (batonHolder !== null) {
      Alert.alert("알림", `이미 다른 팀원(${batonHolderName})이 바통을 보유하고 있습니다.`);
      return;
    }
    
    try {
      const teamDocRef = doc(db, "teams", activeTeam.id);
      await updateDoc(teamDocRef, {
        batonHolder: MY_USER_ID,
        batonHolderName: MY_NAME,
        batonExpiryTime: 172800
      });

      expiryTimerRef.current = setInterval(() => {
        setBatonExpiryTime((prevTime) => {
          if (prevTime <= 1) {
            if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
            forceResetBaton(); 
            Alert.alert("시간 초과", "바통 보유 시간(48시간)이 만료되어 자동 반납되었습니다.");
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

      Alert.alert("바통 터치!", "바통을 받았습니다. 48시간 이내에 러닝을 시작해 주세요!");
    } catch (e) {
      Alert.alert("오류", "바통을 가져오는 데 실패했습니다.");
    }
  };

  // 러닝 시작 (GPS 튐 82km 방지 적용)
  const startRunning = async () => {
    if (batonHolder !== MY_USER_ID) {
      Alert.alert("권한 없음", "바통을 먼저 받아야 합니다.");
      return;
    }

    setIsRunning(true);
    setIsPaused(false);
    setPauseTime(0);

    // 러닝 시작 시 이전 위치를 완전히 초기화하여 순간이동 방지
    setLastLocation(null); 
    setRouteCoordinates([]);
    setDistance(0);

    subscriptionRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 3 },
      (location) => {
        const { latitude, longitude, speed, accuracy } = location.coords;
        const newPoint = { latitude, longitude };

        // GPS 정확도가 25m 이내일 때만 신뢰 (오차 방지)
        if (!isPaused && accuracy && accuracy < 25) {
          setLastLocation((last) => {
            if (last) {
              const move = geolib.getDistance(last, newPoint);
              // 2초 간격이므로 50미터 이상 튀면 비정상(차량 탑승 또는 오류)으로 간주하고 무시
              if (move > 0.5 && move < 50) { 
                setDistance((prev) => prev + move);
                setRouteCoordinates((prev) => [...prev, newPoint]);
              }
            } else {
              // 처음 잡힌 좌표는 거리에 더하지 않고 시작점으로만 등록
              setRouteCoordinates([newPoint]);
            }
            return newPoint;
          });
        }
        setCurrentRegion((prev: any) => ({ ...prev, latitude, longitude }));
      }
    );

    timerRef.current = setInterval(() => {
      setIsPaused((paused) => {
        if (!paused) setDuration((prev) => prev + 1);
        return paused;
      });
    }, 1000);
  };

  // 일시정지 제어
  const togglePause = () => {
    if (!isPaused) {
      setIsPaused(true);
      pauseTimerRef.current = setInterval(() => {
        setPauseTime((prev) => {
          if (prev >= 3599) { 
            forceResetBaton();
            Alert.alert("알림", "일시정지 시간이 1시간을 초과하여 종료되었습니다.");
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setIsPaused(false);
      setPauseTime(0);
      if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);
    }
  };

  // 러닝 완료 및 바통 반납 (랭킹 DB km 단위 반영 적용)
  const handleFinish = () => {
    // 뛴 거리를 km 단위로 확실히 변환
    const finalRunKm = Number((distance / 1000).toFixed(2)); 

    Alert.alert("러닝 종료", `${finalRunKm}km 기록을 종료할까요?`, [
      { text: "취소", style: "cancel" },
      { 
        text: "종료 및 저장", 
        onPress: async () => { 
          if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
          stopIntervals();

          setIsRunning(false);
          setIsPaused(false);
          setDistance(0);
          setDuration(0);
          setPauseTime(0);
          setRouteCoordinates([]);
          setLastLocation(null);

          if (activeTeam?.id) {
            try {
              const teamDocRef = doc(db, "teams", activeTeam.id);
              
              if (finalRunKm > 0) {
                // 방금 뛴 'km 거리'를 팀 누적 거리에 덮어쓰지 않고 합산 (increment)
                await updateDoc(teamDocRef, {
                  batonHolder: null,
                  batonHolderName: "",
                  batonExpiryTime: 172800,
                  totalDistance: increment(finalRunKm) 
                });
                Alert.alert("완료", "기록이 팀 랭킹에 성공적으로 반영되었습니다!"); 
              } else {
                // 뛴 거리가 0km일 경우 바통만 반납
                await updateDoc(teamDocRef, {
                  batonHolder: null,
                  batonHolderName: "",
                  batonExpiryTime: 172800
                });
                Alert.alert("완료", "뛴 거리가 없어 바통만 반납되었습니다.");
              }
            } catch (err) {
              Alert.alert("오류", "기록 저장 중 문제가 발생했습니다.");
            }
          }
        } 
      }
    ]);
  };

  const kmDist = (distance / 1000).toFixed(2);
  const hasBaton = batonHolder === MY_USER_ID;

  // 실시간 누적 거리 시각화 (팀 전체 누적 km + 현재 내가 달리고 있는 km)
  const displayTotalKm = (teamTotalDistance + (distance / 1000)).toFixed(2);

  // activeTeam 정보가 없으면 가입 유도 화면 렌더링
  if (!activeTeam) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <MaterialCommunityIcons name="account-group" size={60} color="#999" />
        <Text style={{ fontSize: 16, color: '#666', marginTop: 15, textAlign: 'center' }}>
          현재 참여 중인 팀이 없습니다.{"\n"}홈 탭에서 팀을 먼저 생성하거나 가입해 주세요!
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 제목 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🏃‍♂️ {activeTeam.name}</Text>
          <Text style={{ fontSize: 12, color: '#888' }}>팀 이어달리기 레이스 진행 중</Text>
        </View>
      </View>

      {/* 제한시간 실시간 안내 바 */}
      {batonHolder !== null && (
        <View style={styles.expiryTimerBar}>
          <Ionicons name="alert-circle-outline" size={18} color="#FF5A5A" />
          <Text style={styles.expiryTimerText}>
            [{hasBaton ? "나" : batonHolderName}] 주자 제한 시간 남음: <Text style={styles.timerHighlight}>{formatExpiryTime(batonExpiryTime)}</Text>
          </Text>
        </View>
      )}

      {/* 대시보드 섹션 */}
      <View style={styles.topSection}>
        {/* 팀 누적 거리 카드 */}
        <View style={styles.infoCard}>
          <View style={styles.row}>
            <Ionicons name="stats-chart" size={20} color="#3B82F6" />
            <Text style={styles.cardLabel}>팀 누적 거리</Text>
          </View>
          <Text style={styles.cardValue}>{displayTotalKm} <Text style={styles.unit}>km</Text></Text>
          <Text style={styles.subHint}>팀원들과 함께 달린 총 거리</Text>
        </View>
        
        <View style={styles.infoCard}>
          <View style={styles.row}>
            <Ionicons name="person-circle" size={20} color="#3B82F6" />
            <Text style={styles.cardLabel}>현재 바통 보유</Text>
          </View>
          <Text style={[styles.cardValue, { color: batonHolder ? (hasBaton ? '#3B82F6' : '#FF9F43') : '#10B981' }]}>
            {batonHolder ? (hasBaton ? "나" : batonHolderName) : "대기 중"}
          </Text>
          <Text style={[styles.subHint, { color: batonHolder ? '#FFA500' : '#10B981' }]}>
            {batonHolder ? (hasBaton ? "내가 바통을 쥐고 있습니다!" : "다른 팀원이 달리는 중입니다.") : "바통을 터치하여 이어 달리세요!"}
          </Text>
        </View>
      </View>

      {/* 지도 영역 */}
      <View style={styles.mapContainer}>
        <MapView style={styles.map} showsUserLocation={true} region={currentRegion} showsCompass={true} showsScale={true} pitchEnabled={true}>
          {routeCoordinates.length > 1 && (
            <>
              <Polyline coordinates={routeCoordinates} strokeWidth={6} strokeColor="#FF5A5A" />
              <Marker coordinate={routeCoordinates[0]} title="START">
                <View style={[styles.markerCircle, { backgroundColor: '#3B82F6' }]}><Text style={styles.markerText}>START</Text></View>
              </Marker>
              <Marker coordinate={routeCoordinates[routeCoordinates.length - 1]} title="FINISH">
                <View style={[styles.markerCircle, { backgroundColor: '#FF5A5A' }]}><Text style={styles.markerText}>FINISH</Text></View>
              </Marker>
            </>
          )}
        </MapView>
      </View>

      {/* 일시정지 오버레이 */}
      {isPaused && (
        <View style={styles.pauseTimerOverlay}>
          <Ionicons name="time-outline" size={18} color="#FF9F43" />
          <Text style={styles.pauseTimerText}>
            일시정지 중... 쉬는 시간 {Math.floor(pauseTime / 60)}:{String(pauseTime % 60).padStart(2, '0')}
          </Text>
        </View>
      )}

      {/* 실시간 하단 기록 컴포넌트 */}
      <View style={styles.bottomStatsBar}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="run-fast" size={20} color="#3B82F6" />
          <Text style={styles.statVal}>{kmDist}</Text>
          <Text style={styles.statLabel}>거리(km)</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="speedometer" size={20} color="#10B981" />
          <Text style={styles.statVal}>{calculatePace()}</Text>
          <Text style={styles.statLabel}>페이스</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="fire" size={20} color="#FF5A5A" />
          <Text style={styles.statVal}>{Math.floor(distance * 0.05)}</Text>
          <Text style={styles.statLabel}>칼로리</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="clock-outline" size={20} color="#3B82F6" />
          <Text style={styles.statVal}>{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}</Text>
          <Text style={styles.statLabel}>시간</Text>
        </View>
      </View>

      {/* 상태별 제어 버튼 처리 */}
      <View style={styles.controls}>
        {batonHolder === null && (
          <TouchableOpacity style={styles.batonBtn} onPress={claimBaton}>
            <MaterialCommunityIcons name="hand-back-right" size={22} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.startBtnText}>바통 받기</Text>
          </TouchableOpacity>
        )}

        {batonHolder !== null && !hasBaton && (
          <View style={styles.disabledBtn}>
            <MaterialCommunityIcons name="lock" size={20} color="#A0A0A0" style={{ marginRight: 6 }} />
            <Text style={styles.disabledBtnText}>{batonHolderName} 주자가 바통 소유 중...</Text>
          </View>
        )}

        {hasBaton && !isRunning && (
          <TouchableOpacity style={styles.startBtn} onPress={startRunning}>
            <Text style={styles.startBtnText}>러닝 시작</Text>
          </TouchableOpacity>
        )}

        {hasBaton && isRunning && (
          <View style={styles.actionRow}>
            <View style={styles.controlWrapper}>
              <TouchableOpacity style={styles.pauseBtn} onPress={togglePause}>
                <Ionicons name={isPaused ? "play" : "pause"} size={35} color="white" />
              </TouchableOpacity>
              <Text style={styles.controlLabel}>{isPaused ? "다시뛰기" : "일시정지"}</Text>
            </View>
            <View style={styles.controlWrapper}>
              <TouchableOpacity style={styles.stopBtn} onPress={handleFinish}>
                <Ionicons name="flag" size={30} color="#333" />
              </TouchableOpacity>
              <Text style={styles.controlLabel}>러닝 종료</Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { justifyContent: 'center', alignItems: 'center', padding: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  expiryTimerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEAEA',
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FFAAAA',
  },
  expiryTimerText: { fontSize: 14, color: '#555', fontWeight: '600' },
  timerHighlight: { color: '#FF4D4D', fontWeight: 'bold' },
  topSection: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 15 },
  infoCard: { backgroundColor: '#fff', width: '48%', borderRadius: 20, padding: 15, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  cardLabel: { fontSize: 12, color: '#888', marginLeft: 5 },
  cardValue: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  unit: { fontSize: 14, color: '#888' },
  subHint: { fontSize: 10, marginTop: 5, color: '#888' },
  mapContainer: { flex: 1, marginHorizontal: 20, borderRadius: 30, overflow: 'hidden' },
  map: { flex: 1 },
  markerCircle: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, borderWidth: 2, borderColor: 'white', elevation: 5 },
  markerText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  pauseTimerOverlay: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#FFF4E5', 
    marginHorizontal: 20, 
    marginTop: 15, 
    paddingVertical: 8, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD19A'
  },
  pauseTimerText: { color: '#FF9F43', fontWeight: 'bold', marginLeft: 6, fontSize: 14 },
  bottomStatsBar: { flexDirection: 'row', backgroundColor: '#fff', margin: 20, padding: 15, borderRadius: 20, justifyContent: 'space-around', elevation: 3 },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 2 },
  statLabel: { fontSize: 10, color: '#999' },
  controls: { paddingBottom: 30, alignItems: 'center', width: '100%' },
  actionRow: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-evenly' },
  controlWrapper: { alignItems: 'center' },
  pauseBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  stopBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  controlLabel: { marginTop: 8, fontSize: 12, fontWeight: '600', color: '#666' },
  startBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 80, paddingVertical: 18, borderRadius: 35, width: '80%', alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  batonBtn: { backgroundColor: '#10B981', paddingHorizontal: 80, paddingVertical: 18, borderRadius: 35, flexDirection: 'row', alignItems: 'center', width: '80%', justifyContent: 'center' },
  disabledBtn: { backgroundColor: '#E0E0E0', paddingVertical: 18, borderRadius: 35, width: '80%', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  disabledBtnText: { color: '#A0A0A0', fontSize: 16, fontWeight: 'bold' }
});