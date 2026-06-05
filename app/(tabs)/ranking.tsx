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
  View,
  StatusBar,
  Modal,
  ScrollView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();

  const today = new Date();
  const currentDay = today.getDate();
  const showWinnerAnnouncement = currentDay >= 1 && currentDay <= 7;
  const lastMonth = today.getMonth() === 0 ? 12 : today.getMonth();

  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [isPickerVisible, setIsPickerVisible] = useState(false);

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
      loading && setLoading(false);
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

  const renderHeader = () => (
    <View>
      <ImageBackground
        source={require('../../assets/images/image_4a23d3.png')}
        style={[styles.headerBackground, { paddingTop: insets.top + 16}]}
        resizeMode="cover"
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerSubText}>이번 달 누적 주행 거리 랭킹</Text>
          <Text style={styles.headerUpdateText}>매월 1일 00:00 초기화</Text>
          
          <TouchableOpacity 
            style={styles.dateSelector} 
            activeOpacity={0.7}
            onPress={() => setIsPickerVisible(true)}
          >
            <Ionicons name="calendar" size={14} color="#FFF" />
            <Text style={styles.dateText}>{selectedYear}년 {selectedMonth}월</Text>
            <Ionicons name="chevron-down" size={14} color="#FFF" />
          </TouchableOpacity>
        </View>
      </ImageBackground>

      <View style={styles.top3Container}>
        <View style={[styles.top3Card, styles.rankOtherCard, styles.rank2Bg]}>
          <Text style={styles.medal}>🥈</Text>
          <Text style={styles.topName} numberOfLines={1}>{second?.name || '-'}</Text>
          <Text style={[styles.topDist, styles.darkText]}>
            {second?.totalDistance.toFixed(2) || '0.00'} <Text style={styles.unitText}>km</Text>
          </Text>
        </View>

        <View style={[styles.top3Card, styles.rank1Card, styles.rank1Bg]}>
          <Text style={[styles.medal, styles.rank1Medal]}>🥇</Text>
          <Text style={styles.topName} numberOfLines={1}>{first?.name || '팀 없음'}</Text>
          <Text style={[styles.topDist, styles.blueText]}>
            {first?.totalDistance.toFixed(2) || '0.00'} <Text style={styles.unitText}>km</Text>
          </Text>
        </View>

        <View style={[styles.top3Card, styles.rankOtherCard, styles.rank3Bg]}>
          <Text style={styles.medal}>🥉</Text>
          <Text style={styles.topName} numberOfLines={1}>{third?.name || '-'}</Text>
          <Text style={[styles.topDist, styles.darkText]}>
            {third?.totalDistance.toFixed(2) || '0.00'} <Text style={styles.unitText}>km</Text>
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />
      
      {showWinnerAnnouncement && (
        <View style={[styles.topRightNotice, { top: insets.top + 10 }]}>
          <Text style={styles.topRightNoticeTitle}>🎉 {lastMonth}월 우승팀 선물 증정!</Text>
          <Text style={styles.topRightNoticeDesc}>🥇 1위: 에어팟 맥스</Text>
          <Text style={styles.topRightNoticeDesc}>🥈 2위: 에어팟 3세대</Text>
          <Text style={styles.topRightNoticeDesc}>🥉 3위: 스타벅스 기프티콘</Text>
        </View>
      )}

      <FlatList
        data={otherTeams}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item, index }) => (
          <View style={styles.listItem}>
            <Text style={styles.listRank}>{index + 4}</Text>
            <Text style={styles.listName}>{item.name}</Text>
            <Text style={styles.listDist}>{item.totalDistance.toFixed(2)} <Text style={styles.unitTextSmall}>km</Text></Text>
          </View>
        )}
        ListEmptyComponent={
          !loading && teams.length <= 3 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>추가 순위 데이터가 없습니다.</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 220 }}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.bottomBannersWrapper}>
        <View style={styles.rewardBanner}>
          <Text style={styles.rewardIcon}>🎁</Text>
          <Text style={styles.rewardText}>
            1위 <Text style={styles.rewardBold}>에어팟 맥스</Text> · 2위 <Text style={styles.rewardBold}>에어팟 3세대</Text> · 3위 <Text style={styles.rewardBold}>스타벅스 기프티콘</Text>
          </Text>
        </View>

        <View style={styles.fixedInfoBanner}>
          <View style={styles.infoTextBox}>
            <Ionicons name="calendar-outline" size={20} color="#3B82F6" style={{marginRight: 8}} />
            <Text style={styles.infoText}>
              랭킹은 <Text style={styles.boldBlue}>매월 1일 00:00에 초기화</Text>되어{"\n"}새로운 기록으로 다시 시작됩니다!
            </Text>
          </View>
          <Image source={require('../../assets/images/image_5672yfsdj.jpg')} style={styles.infoChick} />
        </View>
      </View>

      <Modal
        visible={isPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPickerVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsPickerVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>월 선택</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                <TouchableOpacity
                  key={month}
                  style={[
                    styles.monthOption,
                    selectedMonth === month && styles.selectedMonthOption
                  ]}
                  onPress={() => {
                    setSelectedMonth(month);
                    setIsPickerVisible(false);
                  }}
                >
                  <Text style={[
                    styles.monthText,
                    selectedMonth === month && styles.selectedMonthText
                  ]}>
                    {selectedYear}년 {month}월
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFF' },
  topRightNotice: { position: 'absolute', right: 20, backgroundColor: 'rgba(25, 30, 45, 0.85)', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, zIndex: 100, elevation: 10 },
  topRightNoticeTitle: { color: '#FFD700', fontWeight: 'bold', fontSize: 13, marginBottom: 5 },
  topRightNoticeDesc: { color: '#FFF', fontSize: 11, marginBottom: 2, fontWeight: '500' },
  headerBackground: { height: 250, backgroundColor: '#3B82F6', overflow: 'hidden' },
  headerNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 29, height: 50 },
  headerTitleText: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  headerContent: { alignItems: 'center', marginTop: 40, paddingTop: 31 },
  
  // 수정됨: 텍스트에 그림자 추가 (가독성 향상)
  headerSubText: { 
    color: 'white', 
    fontSize: 20, 
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  // 수정됨: 텍스트에 그림자 추가
  headerUpdateText: { 
    color: 'rgba(255,255,255,0.9)', 
    fontSize: 12, 
    marginTop: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  // 수정됨: 투명 버튼에 박스 그림자 추가 (iOS: shadow / Android: elevation)
  dateSelector: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.25)', 
    paddingHorizontal: 15, 
    paddingVertical: 6, 
    borderRadius: 20, 
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  dateText: { marginHorizontal: 8, fontWeight: '600', color: '#FFF', fontSize: 13 },
  
  top3Container: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginTop: -11, paddingHorizontal: 15, marginBottom: 10 },
  top3Card: { borderRadius: 20, paddingVertical: 18, paddingHorizontal: 10, alignItems: 'center', marginHorizontal: 5, elevation: 8, borderWidth: 1, justifyContent: 'center' },
  rank1Bg: { backgroundColor: '#FFFBF0', borderColor: '#FFE8A3' },
  rank2Bg: { backgroundColor: '#F5F8FF', borderColor: '#DDE7FF' },
  rank3Bg: { backgroundColor: '#FFF5F2', borderColor: '#FFEDE8' },
  rank1Card: { width: width * 0.35, height: 145, zIndex: 2 }, 
  rankOtherCard: { width: width * 0.28, height: 125, transform: [{ translateY: -15 }] }, 
  medal: { fontSize: 34, marginBottom: 5 },
  rank1Medal: { fontSize: 40, marginBottom: 3 },
  topName: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 2 },
  topDist: { fontSize: 15, fontWeight: 'bold' },
  blueText: { color: '#3B82F6' },
  darkText: { color: '#333' },
  unitText: { fontSize: 10, color: '#888' },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 10, marginHorizontal: 20, elevation: 1 },
  listRank: { width: 30, fontSize: 16, fontWeight: 'bold', color: '#555' },
  listName: { flex: 1, fontSize: 15, color: '#333', fontWeight: '500' },
  listDist: { fontSize: 15, fontWeight: 'bold', color: '#3B82F6' },
  unitTextSmall: { fontSize: 10, color: '#888' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#999' },
  bottomBannersWrapper: { position: 'absolute', bottom: 25, left: 20, right: 20 },
  rewardBanner: { backgroundColor: '#FFF9E6', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10, elevation: 10, borderWidth: 1, borderColor: '#FFE8A3' },
  rewardIcon: { fontSize: 14, marginRight: 6 },
  rewardText: { fontSize: 11, color: '#8A5A19' },
  rewardBold: { fontWeight: 'bold', color: '#333' },
  fixedInfoBanner: { backgroundColor: '#F2F7FF', borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 10 },
  infoTextBox: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  infoText: { fontSize: 11, color: '#555', lineHeight: 16 },
  boldBlue: { color: '#3B82F6', fontWeight: 'bold' },
  infoChick: { width: 45, height: 45, resizeMode: 'contain' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: width * 0.75,
    maxHeight: '50%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  monthOption: {
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedMonthOption: {
    backgroundColor: '#EBF8FF',
    borderRadius: 10,
    borderBottomWidth: 0,
  },
  monthText: {
    fontSize: 14,
    color: '#4B5563',
  },
  selectedMonthText: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
});