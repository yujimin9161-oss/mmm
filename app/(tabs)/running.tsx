import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as geolib from 'geolib';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface Coord {
  latitude: number;
  longitude: number;
}

export default function RunningScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<Coord[]>([]);
  const [distance, setDistance] = useState(0); 
  const [duration, setDuration] = useState(0); 
  const [pauseTime, setPauseTime] = useState(0); // 쉬는 시간 추적
  const [lastLocation, setLastLocation] = useState<Coord | null>(null);
  const [currentRegion, setCurrentRegion] = useState<any>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionRef = useRef<any>(null);

  const targetDistance = 5.00;

  const calculatePace = () => {
    if (distance <= 0 || duration <= 0) return "-'--\"";
    const distanceInKm = distance / 1000;
    const paceInSeconds = duration / distanceInKm;
    const minutes = Math.floor(paceInSeconds / 60);
    const seconds = Math.floor(paceInSeconds % 60);
    if (minutes > 59) return "-'--\"";
    return `${minutes}'${String(seconds).padStart(2, '0')}"`;
  };

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
    return () => stopIntervals();
  }, []);

  const stopIntervals = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);
    if (subscriptionRef.current) subscriptionRef.current.remove();
  };

  const resetRunningData = () => {
    stopIntervals();
    setIsRunning(false);
    setIsPaused(false);
    setDistance(0);
    setDuration(0);
    setPauseTime(0);
    setRouteCoordinates([]);
    setLastLocation(null);
  };

  const startRunning = async () => {
    setIsRunning(true);
    setIsPaused(false);
    setPauseTime(0);

    subscriptionRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 3 },
      (location) => {
        const { latitude, longitude, speed } = location.coords;
        const newPoint = { latitude, longitude };

        if (!isPaused && (speed === null || speed > 0.5)) {
          setLastLocation((last) => {
            if (last) {
              const move = geolib.getDistance(last, newPoint);
              if (move > 1) {
                setDistance((prev) => prev + move);
                setRouteCoordinates((prev) => [...prev, newPoint]);
              }
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

  const togglePause = () => {
    if (!isPaused) {
      setIsPaused(true);
      pauseTimerRef.current = setInterval(() => {
        setPauseTime((prev) => {
          if (prev >= 3599) { 
            resetRunningData();
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

  const handleFinish = () => {
    Alert.alert("러닝 종료", `${(distance / 1000).toFixed(2)}km 기록을 종료할까요?`, [
      { text: "취소", style: "cancel" },
      { text: "종료 및 초기화", onPress: () => { resetRunningData(); Alert.alert("완료", "초기화되었습니다."); } }
    ]);
  };

  const kmDist = (distance / 1000).toFixed(2);
  const remainingDist = Math.max(targetDistance - Number(kmDist), 0).toFixed(2);
  const progress = Math.min((Number(kmDist) / targetDistance) * 100, 100).toFixed(0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>바통 러닝</Text>
        <View style={styles.targetBadge}>
          <Text style={styles.targetText}>🎯 목표 {targetDistance.toFixed(2)} km</Text>
        </View>
      </View>

      <View style={styles.topSection}>
        <View style={styles.infoCard}>
          <View style={styles.row}>
            <Ionicons name="flag" size={20} color="#3B82F6" />
            <Text style={styles.cardLabel}>남은 거리</Text>
          </View>
          <Text style={styles.cardValue}>{remainingDist} <Text style={styles.unit}>km</Text></Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </View>
        <View style={styles.infoCard}>
          <View style={styles.row}>
            <Ionicons name="person-circle" size={20} color="#3B82F6" />
            <Text style={styles.cardLabel}>현재 바통 보유</Text>
          </View>
          <Text style={styles.cardValue}>나</Text>
          <Text style={styles.subHint}>다음 주자에게 전달하세요!</Text>
        </View>
      </View>

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

      {/* 쉬는 시간 전용 시계 UI - 일시정지 중에만 표시 */}
      {isPaused && (
        <View style={styles.pauseTimerOverlay}>
          <Ionicons name="time-outline" size={18} color="#FF9F43" />
          <Text style={styles.pauseTimerText}>
            일시정지 중... 쉬는 시간 {Math.floor(pauseTime / 60)}:{String(pauseTime % 60).padStart(2, '0')}
          </Text>
        </View>
      )}

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

      <View style={styles.controls}>
        {!isRunning ? (
          <TouchableOpacity style={styles.startBtn} onPress={startRunning}>
            <Text style={styles.startBtnText}>러닝 시작</Text>
          </TouchableOpacity>
        ) : (
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  targetBadge: { backgroundColor: '#EBF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  targetText: { color: '#3B82F6', fontWeight: 'bold', fontSize: 13 },
  topSection: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 15 },
  infoCard: { backgroundColor: '#fff', width: '48%', borderRadius: 20, padding: 15, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  cardLabel: { fontSize: 12, color: '#888', marginLeft: 5 },
  cardValue: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  unit: { fontSize: 14, color: '#888' },
  progressBarBg: { height: 6, backgroundColor: '#EEE', borderRadius: 3, marginTop: 10 },
  progressBarFill: { height: 6, backgroundColor: '#3B82F6', borderRadius: 3 },
  subHint: { fontSize: 10, color: '#FFA500', marginTop: 5 },
  mapContainer: { flex: 1, marginHorizontal: 20, borderRadius: 30, overflow: 'hidden' },
  map: { flex: 1 },
  markerCircle: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, borderWidth: 2, borderColor: 'white', elevation: 5 },
  markerText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  
  // 쉬는 시간 타이머 스타일
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
  controls: { paddingBottom: 30, alignItems: 'center' },
  actionRow: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-evenly' },
  controlWrapper: { alignItems: 'center' },
  pauseBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  stopBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  controlLabel: { marginTop: 8, fontSize: 12, fontWeight: '600', color: '#666' },
  startBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 80, paddingVertical: 18, borderRadius: 35 },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});