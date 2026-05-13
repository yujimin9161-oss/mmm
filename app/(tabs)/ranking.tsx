import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

interface Team {
  id: string;
  name: string;
  totalDistance: number;
}

export default function RankingScreen() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "teams"),
      orderBy("totalDistance", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teamList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Team[];
      
      setTeams(teamList);
      setLoading(false);
    }, (error) => {
      console.error("랭킹 로드 에러:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const first = teams[0];
  const second = teams[1];
  const third = teams[2];
  const otherTeams = teams.slice(3);

  // 상단 헤더 영역 함수 (FlatList의 Header로 사용)
  const renderHeader = () => (
    <View>
      <ImageBackground
        source={require('../../assets/images/image_4a23d3.png')}
        style={styles.headerBackground}
        resizeMode="cover"
      >
        <View style={styles.headerNav}>
          <TouchableOpacity><Ionicons name="chevron-back" size={24} color="white" /></TouchableOpacity>
          <Text style={styles.headerTitleText}>랭킹</Text>
          <TouchableOpacity><Ionicons name="information-circle-outline" size={24} color="white" /></TouchableOpacity>
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerSubText}>이번 달 누적 주행 거리 랭킹</Text>
          <Text style={styles.headerUpdateText}>매월 1일 00:00 초기화</Text>
          <View style={styles.dateSelector}>
            <Ionicons name="calendar" size={14} color="#333" />
            <Text style={styles.dateText}>2025년 5월</Text>
            <Ionicons name="chevron-down" size={14} color="#333" />
          </View>
        </View>
      </ImageBackground>

      {/* TOP 3 섹션 */}
      <View style={styles.top3Container}>
        {/* 2위 */}
        <View style={[styles.top3Card, styles.rankOtherCard, styles.rank2Bg]}>
          <Text style={styles.medal}>🥈</Text>
          <View style={[styles.topAvatar, {backgroundColor: '#E0E0E0'}]} />
          <Text style={styles.topName} numberOfLines={1}>{second?.name || '-'}</Text>
          <Text style={[styles.topDist, styles.darkText]}>
            {second?.totalDistance.toFixed(2) || '0.00'} <Text style={styles.unitText}>km</Text>
          </Text>
          <View style={styles.levelTag}><Text style={styles.levelText}>Lv.18</Text></View>
        </View>

        {/* 1위 */}
        <View style={[styles.top3Card, styles.rank1Card, styles.rank1Bg]}>
          <Text style={styles.medal}>🥇</Text>
          <View style={[styles.topAvatar, {backgroundColor: '#3B82F6', width: 66, height: 66, borderRadius: 33}]} />
          <Text style={styles.topName} numberOfLines={1}>{first?.name || '팀 없음'}</Text>
          <Text style={[styles.topDist, styles.blueText]}>
            {first?.totalDistance.toFixed(2) || '0.00'} <Text style={styles.unitText}>km</Text>
          </Text>
          <View style={[styles.levelTag, {backgroundColor: '#FFF1E6'}]}>
            <Text style={[styles.levelText, {color: '#FF8A3D'}]}>Lv.24</Text>
          </View>
        </View>

        {/* 3위 */}
        <View style={[styles.top3Card, styles.rankOtherCard, styles.rank3Bg]}>
          <Text style={styles.medal}>🥉</Text>
          <View style={[styles.topAvatar, {backgroundColor: '#E0E0E0'}]} />
          <Text style={styles.topName} numberOfLines={1}>{third?.name || '-'}</Text>
          <Text style={[styles.topDist, styles.darkText]}>
            {third?.totalDistance.toFixed(2) || '0.00'} <Text style={styles.unitText}>km</Text>
          </Text>
          <View style={styles.levelTag}><Text style={styles.levelText}>Lv.16</Text></View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 랭킹 리스트 (FlatList로 변경하여 상단은 고정 헤더처럼, 하단은 배너 고정) */}
      <FlatList
        data={otherTeams}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item, index }) => (
          <View style={styles.listItem}>
            <Text style={styles.listRank}>{index + 4}</Text>
            <View style={[styles.listAvatar, {backgroundColor: '#F0F0F0'}]} />
            <Text style={styles.listName}>{item.name}</Text>
            <Text style={styles.listDist}>{item.totalDistance.toFixed(2)} <Text style={styles.unitTextSmall}>km</Text></Text>
          </View>
        )}
        ListEmptyComponent={
          !loading && otherTeams.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>추가 순위 데이터가 없습니다.</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 120 }} // 배너 공간 확보를 위한 여백
        showsVerticalScrollIndicator={false}
      />

      {/* 하단 고정 안내 배너 */}
      <View style={styles.fixedInfoBanner}>
        <View style={styles.infoTextBox}>
          <Ionicons name="calendar-outline" size={20} color="#3B82F6" style={{marginRight: 8}} />
          <Text style={styles.infoText}>
            랭킹은 <Text style={styles.boldBlue}>매월 1일 00:00에 초기화</Text>되어{"\n"}새로운 기록으로 다시 시작됩니다!
          </Text>
        </View>
        <Image source={require('../../assets/images/image_5672yfsdj.jpg')} style={styles.infoChick} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFF' },
  headerBackground: {
    height: 250, 
    marginTop: -22,         // 👈 이 숫자가 핵심! 사진을 위로 40만큼 끌어올립니다.
    paddingTop: 10,
    backgroundColor: '#3B82F6',
    overflow: 'hidden',
  },
  headerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 29,
    height: 50,
  },
  headerTitleText: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  headerContent: {
    alignItems: 'center',
    marginTop: 40,
    paddingTop: 31,
  },
  headerSubText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  headerUpdateText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 5 },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 15,
    elevation: 3,
  },
  dateText: { marginHorizontal: 8, fontWeight: '600', color: '#333', fontSize: 13 },

  top3Container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginTop: -25, // 카드들이 배경 위로 올라오도록 조절
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  top3Card: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 5,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    borderWidth: 1,
  },
  // 1, 2, 3위 개별 배경 및 테두리색 추가
  rank1Bg: { backgroundColor: '#FFFBF0', borderColor: '#FFE8A3' },
  rank2Bg: { backgroundColor: '#F5F8FF', borderColor: '#DDE7FF' },
  rank3Bg: { backgroundColor: '#FFF5F2', borderColor: '#FFEDE8' },

  rank1Card: { width: width * 0.35, height: 210, zIndex: 2 },
  rankOtherCard: { width: width * 0.28, height: 180,transform: [{ translateY: -15 }] },
  medal: { fontSize: 22, marginBottom: 5 },
  topAvatar: { width: 56, height: 56, borderRadius: 28, marginBottom: 8, borderWidth: 2, borderColor: '#DDD' },
  topName: { fontSize: 13, fontWeight: '600', color: '#444' },
  topDist: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  blueText: { color: '#3B82F6' },
  darkText: { color: '#333' },
  unitText: { fontSize: 10, color: '#888' },
  levelTag: {
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 8,
  },
  levelText: { fontSize: 10, color: '#3B82F6', fontWeight: 'bold' },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    marginHorizontal: 20,
    elevation: 1,
  },
  listRank: { width: 30, fontSize: 16, fontWeight: 'bold', color: '#555' },
  listAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 15 },
  listName: { flex: 1, fontSize: 15, color: '#333', fontWeight: '500' },
  listDist: { fontSize: 15, fontWeight: 'bold', color: '#3B82F6' },
  unitTextSmall: { fontSize: 10, color: '#888' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#999' },

  // 하단 고정 배너 스타일 (Absolute 위치 사용)
  fixedInfoBanner: {
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
    backgroundColor: '#F2F7FF',
    borderRadius: 20,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 10, // 배너가 리스트 위에 뜨도록 설정
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  infoTextBox: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  infoText: { fontSize: 11, color: '#555', lineHeight: 16 },
  boldBlue: { color: '#3B82F6', fontWeight: 'bold' },
  infoChick: { width: 45, height: 45, resizeMode: 'contain' }
});