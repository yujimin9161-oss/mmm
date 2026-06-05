import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Linking, Alert, ImageBackground, LogBox, Modal, TextInput, Button } from 'react-native';
import { collection, addDoc, onSnapshot, query, orderBy,deleteDoc,doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig'; // 🌟 파이어베이스 설정 파일 경로를 확인해주세요

LogBox.ignoreAllLogs();

// 🌟 예림님이 주신 원본 데이터 28개
const initialMarathonData = [
  { id: 1, date: '2026-06-06', name: '2026 서울 10K 마라톤', loc: '서울 상암 월드컵공원', type: '10K', color: '#FF9500', dday: '24', link: 'https://www.seoul10k.com' },
  { id: 2, date: '2026-06-17', name: '2026 부산 바다 하프 마라톤', loc: '부산 광안리 해변', type: '하프', color: '#34C759', dday: '35', link: 'https://www.busanmarathon.co.kr' },
  { id: 3, date: '2026-06-24', name: '2026 제주 국제 풀코스 마라톤', loc: '제주 종합경기장', type: '풀코스', color: '#5856D6', dday: '42', link: 'https://www.jejumarathon.com' },
  { id: 4, date: '2026-05-30', name: '제1회 부천시육상연맹회장배 마라톤', loc: '경기 부천', type: '하프', color: '#34C759', dday: '11', link: 'http://www.bucheonrun.co.kr' },
  { id: 5, date: '2026-05-31', name: '제4회 밤섬 마라톤', loc: '서울 여의도', type: '하프', color: '#34C759', dday: '12', link: 'http://www.bamseomrun.com' },
  { id: 6, date: '2026-06-06', name: '2026 백산수 심심런', loc: '서울 상암', type: '10K', color: '#FF9500', dday: '18', link: 'https://www.baeksansurun.com' },
  { id: 7, date: '2026-06-06', name: '2026 푸른하늘런', loc: '서울', type: '하프', color: '#34C759', dday: '18', link: 'http://www.blueskyrun.co.kr' },
  { id: 8, date: '2026-06-06', name: '2026 춘천봄내마라톤', loc: '강원 춘천', type: '하프', color: '#34C759', dday: '18', link: 'http://www.ccbomnae.co.kr' },
  { id: 9, date: '2026-06-13', name: '제1회 모두런', loc: '세종 중앙공원', type: '10K', color: '#FF9500', dday: '25', link: 'https://www.modurun.co.kr' },
  { id: 10, date: '2026-06-13', name: '2026 지중해마을 라이트런', loc: '충남 아산', type: '10K', color: '#FF9500', dday: '25', link: 'http://www.medrun.co.kr' },
  { id: 11, date: '2026-06-20', name: '제2회 희망 서울 마라톤', loc: '서울 여의도', type: '하프', color: '#34C759', dday: '32', link: 'http://www.seoulrun.kr' },
  { id: 12, date: '2026-06-20', name: '2026 웰메이드런', loc: '부산', type: '하프', color: '#34C759', dday: '32', link: 'http://www.wellmaderun.com' },
  { id: 13, date: '2026-06-21', name: '2026 참행복 마라톤', loc: '서울 상암', type: '하프', color: '#34C759', dday: '33', link: 'http://www.chamrun.co.kr' },
  { id: 14, date: '2026-06-21', name: '2026 람사르습지 밤섬런', loc: '서울', type: '10K', color: '#FF9500', dday: '33', link: 'http://www.bamseomwetland.com' },
  { id: 15, date: '2026-06-21', name: '2026 보은 속리산 말티재 힐링 알몸 마라톤', loc: '충북 보은', type: '10K', color: '#FF9500', dday: '33', link: 'http://www.boeunmarathon.com' },
  { id: 16, date: '2026-06-27', name: '2026 인사이더런 S.', loc: '서울', type: '10K', color: '#FF9500', dday: '39', link: 'http://www.insiderrun.com' },
  { id: 17, date: '2026-06-28', name: '2026 큰별 하프 마라톤', loc: '서울', type: '하프', color: '#34C759', dday: '40', link: 'http://www.bigstarrun.com' },
  { id: 18, date: '2026-06-28', name: '2026 전국블루베리마라톤축제', loc: '전북', type: '10K', color: '#FF9500', dday: '40', link: 'http://www.blueberryrun.co.kr' },
  { id: 19, date: '2026-06-28', name: '2026 서울런', loc: '경기', type: '10K', color: '#FF9500', dday: '40', link: 'http://www.seoulrun-gg.co.kr' },
  { id: 20, date: '2026-07-19', name: '2026 부산 서머 나이트 레이스', loc: '부산', type: '하프', color: '#34C759', dday: '61', link: 'https://www.busansummernight.com' },
  { id: 21, date: '2026-08-23', name: '2026 대구세계마스터즈 10km대회', loc: '대구 스타디움', type: '10K', color: '#FF9500', dday: '96', link: 'https://www.daegumarathon.com/masters10k' },
  { id: 22, date: '2026-08-30', name: '2026 대구세계마스터즈 하프마라톤대회', loc: '대구 신천동로', type: '하프', color: '#34C759', dday: '103', link: 'https://www.daegumarathon.com/mastershalf' },
  { id: 23, date: '2026-09-06', name: '2026 봉화송이 전국마라톤', loc: '경북 봉화', type: '하프', color: '#34C759', dday: '110', link: 'http://www.bonghwarun.com' },
  { id: 24, date: '2026-09-12', name: '2026 양양 강변 전국 마라톤', loc: '강원 양양', type: '하프', color: '#34C759', dday: '116', link: 'http://www.yangyangrun.co.kr' },
  { id: 25, date: '2026-10-04', name: '2026 파주북시티마라톤', loc: '경기 파주', type: '10K', color: '#FF9500', dday: '138', link: 'http://www.pajubookcityrun.com' },
  { id: 26, date: '2026-10-04', name: '2026 안동마라톤', loc: '경북 안동', type: '풀코스', color: '#5856D6', dday: '138', link: 'http://www.andongmarathon.com' },
  { id: 27, date: '2026-10-11', name: '2026 서울레이스', loc: '서울 서울광장', type: '하프', color: '#34C759', dday: '145', link: 'https://www.seoulrace.com' },
  { id: 28, date: '2026-10-11', name: '2026 MBN 전국 나주 마라톤대회', loc: '전남 나주', type: '풀코스', color: '#5856D6', dday: '145', link: 'http://www.mbnnajurun.com' },
];

export default function MarathonCalendar() {
  const [currentMonth, setCurrentMonth] = useState(6);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [firebaseData, setFirebaseData] = useState<any[]>([]);
  const [newEvent, setNewEvent] = useState({ name: '', date: '', link: '', loc: '장소 미정', type: '10K' });
  
  const deleteEvent = async (id: string) => {
  try {
    await deleteDoc(doc(db, "marathons", id));
    Alert.alert("알림", "일정이 삭제되었습니다.");
  } catch (e) {
    Alert.alert("에러", "삭제에 실패했습니다.");
  }
};
  // 🌟 원본 데이터 + Firebase 데이터 병합
  const marathonData = [...initialMarathonData, ...firebaseData];

  useEffect(() => {
    const q = query(collection(db, "marathons"), orderBy("date", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFirebaseData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const saveEvent = async () => {
    if (!newEvent.name || !newEvent.date) { Alert.alert("알림", "날짜와 이름을 입력하세요!"); return; }
    try {
      await addDoc(collection(db, "marathons"), { ...newEvent, color: '#FF9500', dday: '0' });
      setModalVisible(false);
      Alert.alert("성공", "일정이 추가되었습니다!");
    } catch (e) { Alert.alert("에러", "저장 실패"); }
  };

  const handleOpenMarathonLink = async (url: string) => {
    if (!url) return;
    let fUrl = url.trim();
    if (!fUrl.startsWith('http')) fUrl = `https://${fUrl}`;
    try { await Linking.openURL(fUrl); } catch { Alert.alert("안내", "연결할 수 없는 링크입니다."); }
  };

  const getEventsByDate = (dateStr: string) => marathonData.filter(e => e.date === dateStr);

  const renderCalendar = (month: number) => {
    const daysInMonth = new Date(2026, month, 0).getDate();
    const firstDay = new Date(2026, month - 1, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<View key={`empty-${i}`} style={styles.dayBox} />);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `2026-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const events = getEventsByDate(dateStr);
      const isSelected = selectedDate === dateStr;
      days.push(
        <TouchableOpacity key={d} style={[styles.dayBox, isSelected && styles.selectedDayBox]} onPress={() => setSelectedDate(dateStr)}>
          <Text style={[styles.dayText, new Date(2026, month-1, d).getDay() === 0 ? {color: 'red'} : null, isSelected && { color: 'white', fontWeight: 'bold' }]}>{d}</Text>
          {events.length > 0 && (
            <View style={[styles.badge, { backgroundColor: events[0].color + '22' }]}>
              <View style={[styles.dot, { backgroundColor: events[0].color }]} />
              <Text style={[styles.badgeText, { color: events[0].color }]}>{events.length > 1 ? `대회 ${events.length}` : events[0].type}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }
    return days;
  };

  const renderSelectedDateDetails = () => {
    if (!selectedDate) return null;
    const idxEvents = getEventsByDate(selectedDate);
    const [_, m, d] = selectedDate.split('-');
    
    return (
      <View style={styles.detailSection}>
        <View style={styles.detailHeaderRow}>
          <Text style={styles.detailSectionTitle}>📅 {parseInt(m)}월 {parseInt(d)}일 상세 일정</Text>
          <TouchableOpacity onPress={() => setSelectedDate(null)}><Text style={styles.closeBtnText}>닫기</Text></TouchableOpacity>
        </View>

        {idxEvents.length === 0 ? (
          <View style={styles.emptyDetailCard}>
            <Text style={styles.emptyDetailText}>해당 날짜에 예정된 마라톤 대회가 없습니다.</Text>
          </View>
        ) : (
          idxEvents.map(event => (
            <View 
              key={`selected-${event.id}`} 
              style={[styles.eventCard, { borderLeftWidth: 5, borderLeftColor: event.color, flexDirection: 'row', alignItems: 'center' }]}
            >
              <TouchableOpacity 
                style={{ flex: 1 }} 
                onPress={() => handleOpenMarathonLink(event.link)} 
                activeOpacity={0.7}
              >
                <View style={styles.eventInfo}>
                  <View style={styles.badgeContainer}>
                    <Text style={[styles.inlineBadge, { backgroundColor: event.color, color: 'white' }]}>{event.type}</Text>
                    <Text style={[styles.inlineDday, { color: event.color }]}>D-{event.dday}</Text>
                    <Text style={styles.linkIndicator}>공식 접수처 ↗</Text>
                  </View>
                  <Text style={styles.eventName}>{event.name}</Text>
                  <Text style={styles.eventLoc}>📍 {event.loc}</Text>
                </View>
              </TouchableOpacity>

              {/* 🌟 Firebase로 추가된 일정(ID가 긴 경우)에만 삭제 버튼 노출 */}
              {typeof event.id === 'string' && event.id.length > 5 && (
                <TouchableOpacity onPress={() => deleteEvent(event.id)} style={{ padding: 10 }}>
                  <Ionicons name="trash-outline" size={20} color="red" />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        <ImageBackground source={require('../../assets/images/chicken.png')} style={styles.header} imageStyle={styles.headerImage}>
          <View style={styles.headerOverlay}><Text style={styles.title}>    마라톤 캘린더📆</Text></View>
        </ImageBackground>
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => currentMonth > 5 && setCurrentMonth(currentMonth - 1)}><Ionicons name="chevron-back" size={20} /></TouchableOpacity>
            <Text style={styles.monthTitle}>2026년 {currentMonth}월</Text>
            <TouchableOpacity onPress={() => currentMonth < 12 && setCurrentMonth(currentMonth + 1)}><Ionicons name="chevron-forward" size={20} /></TouchableOpacity>
          </View>
          <View style={styles.weekRow}>{['일', '월', '화', '수', '목', '금', '토'].map((d, i) => <Text key={d} style={[styles.weekText, i === 0 ? {color: 'red'} : i === 6 ? {color: 'blue'} : null]}>{d}</Text>)}</View>
          <View style={styles.daysGrid}>{renderCalendar(currentMonth)}</View>
          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: '#FF9500'}]} /><Text style={styles.legendText}>10K</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: '#34C759'}]} /><Text style={styles.legendText}>하프</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: '#5856D6'}]} /><Text style={styles.legendText}>풀코스</Text></View>
          </View>
        </View>
        {renderSelectedDateDetails()}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>다가오는 마라톤 일정</Text>
          {marathonData.map((event, index) => (
            <TouchableOpacity key={index} style={styles.eventCard} onPress={() => handleOpenMarathonLink(event.link)} activeOpacity={0.7}>
              <View style={styles.dateInfo}><Text style={[styles.eventDateText, { color: event.color }]}>{event.date.slice(5).replace('-', '.')}</Text></View>
              <View style={styles.eventInfo}><Text style={styles.eventName}>{event.name}</Text><Text style={styles.eventLoc}>{event.loc}</Text></View>
              <Text style={[styles.dday, { color: event.color }]}>D-{event.dday}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>새 마라톤 추가</Text>
            <TextInput style={styles.input} placeholder="날짜 (2026-06-06)" onChangeText={(t) => setNewEvent({...newEvent, date: t})} />
            <TextInput style={styles.input} placeholder="대회 이름" onChangeText={(t) => setNewEvent({...newEvent, name: t})} />
            <TextInput style={styles.input} placeholder="접수 링크" onChangeText={(t) => setNewEvent({...newEvent, link: t})} />
            <Button title="저장하기" onPress={saveEvent} />
            <Button title="취소" color="red" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>

      <View style={styles.buttonFloatingContainer}>
        <TouchableOpacity style={styles.addEventButton} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={20} color="white" style={{ marginRight: 8 }} />
          <Text style={styles.addEventButtonText}>마라톤 일정 추가하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  header: { width: '100%', height: 250, overflow: 'hidden' },
  headerImage: { width: '120%', height: '100%', top: '-20%', left: '-13%', resizeMode: 'cover' },
  headerOverlay: { paddingTop: 50, paddingBottom: 50, paddingHorizontal: 50, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', shadowColor: '#000000', shadowOffset: { width: 1, height: 1 }, shadowRadius: 3, shadowOpacity: 0.6, marginRight: 11, marginTop: 80 },
  calendarCard: { backgroundColor: 'white', marginHorizontal: 11, marginBottom: 15, borderRadius: 20, padding: 5, elevation: 2, marginTop: -53 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  monthTitle: { fontSize: 18, fontWeight: 'bold' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  weekText: { fontSize: 12, color: '#666', width: 40, textAlign: 'center' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  dayBox: { width: '14.28%', height: 60, alignItems: 'center', paddingTop: 5, borderRadius: 10 },
  selectedDayBox: { backgroundColor: '#007AFF' },
  dayText: { fontSize: 14, fontWeight: '500' },
  badge: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', marginTop: 2, maxWidth: '90%' },
  dot: { width: 4, height: 4, borderRadius: 2, marginRight: 3 },
  badgeText: { fontSize: 7, fontWeight: 'bold' },
  legend: { flexDirection: 'row', justifyContent: 'center', marginTop: 15, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 },
  legendText: { fontSize: 10, color: '#666' },
  detailSection: { paddingHorizontal: 20, marginBottom: 15 },
  detailHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  detailSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  closeBtnText: { color: '#888', fontSize: 13, paddingRight: 5 },
  emptyDetailCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, alignItems: 'center', justifyContent: 'center' },
  emptyDetailText: { color: '#999', fontSize: 13 },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  inlineBadge: { fontSize: 9, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  inlineDday: { fontSize: 11, fontWeight: 'bold', marginLeft: 8 },
  linkIndicator: { fontSize: 11, color: '#007AFF', marginLeft: 'auto', fontWeight: '600', paddingRight: 5 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  eventCard: { backgroundColor: 'white', borderRadius: 15, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dateInfo: { width: 50 },
  eventDateText: { fontSize: 16, fontWeight: 'bold' },
  eventInfo: { flex: 1, marginLeft: 10 },
  eventName: { fontSize: 14, fontWeight: 'bold' },
  eventLoc: { fontSize: 11, color: '#888' },
  dday: { fontWeight: 'bold', marginRight: 5 },
  buttonFloatingContainer: { position: 'absolute', bottom: 25, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  addEventButton: { backgroundColor: '#007AFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', height: 52, borderRadius: 26, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
  addEventButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { backgroundColor: 'white', margin: 20, padding: 30, borderRadius: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 10, marginBottom: 10 }
});