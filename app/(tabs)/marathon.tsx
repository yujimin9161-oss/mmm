import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 마라톤 일정 데이터 (캘린더 배지 및 리스트용)
const marathonData = [
  { id: 1, date: '2026-06-06', name: '2026 서울 10K 마라톤', loc: '서울 상암 월드컵공원', type: '10K', color: '#FF9500', dday: '24' },
  { id: 2, date: '2026-06-17', name: '2026 부산 바다 하프 마라톤', loc: '부산 광안리 해변', type: '하프', color: '#34C759', dday: '35' },
  { id: 3, date: '2026-06-24', name: '2026 제주 국제 풀코스 마라톤', loc: '제주 종합경기장', type: '풀코스', color: '#5856D6', dday: '42' },
];

export default function MarathonCalendar() {
  const [currentMonth, setCurrentMonth] = useState(6); // 2026년 6월 시작

  // 간단한 월력 생성 로직 (2026년 기준)
  const renderCalendar = (month: number) => {
    const daysInMonth = new Date(2026, month, 0).getDate();
    const firstDay = new Date(2026, month - 1, 1).getDay();
    const days = [];

    // 빈 칸 (이전 달)
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayBox} />);
    }

    // 날짜 칸
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `2026-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const event = marathonData.find(e => e.date === dateStr);

      days.push(
        <View key={d} style={styles.dayBox}>
          <Text style={[styles.dayText, new Date(2026, month-1, d).getDay() === 0 ? {color: 'red'} : null]}>
            {d}
          </Text>
          {event && (
            <View style={[styles.badge, { backgroundColor: event.color + '22' }]}>
              <View style={[styles.dot, { backgroundColor: event.color }]} />
              <Text style={[styles.badgeText, { color: event.color }]}>{event.type}</Text>
            </View>
          )}
        </View>
      );
    }
    return days;
  };

  return (
    <ScrollView style={styles.container}>
      {/* 헤더 섹션 */}
      <View style={styles.header}>
        <Text style={styles.brand}>RelayMate</Text>
        <Text style={styles.title}>마라톤 캘린더</Text>
      </View>

      {/* 월력 섹션 (image_4ab2bb.jpg 참고) */}
      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => currentMonth > 6 && setCurrentMonth(currentMonth - 1)}>
            <Ionicons name="chevron-back" size={20} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>2026년 {currentMonth}월</Text>
          <TouchableOpacity onPress={() => currentMonth < 12 && setCurrentMonth(currentMonth + 1)}>
            <Ionicons name="chevron-forward" size={20} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
            <Text key={d} style={[styles.weekText, i === 0 ? {color: 'red'} : i === 6 ? {color: 'blue'} : null]}>{d}</Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {renderCalendar(currentMonth)}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: '#FF9500'}]} /><Text style={styles.legendText}>10K</Text></View>
          <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: '#34C759'}]} /><Text style={styles.legendText}>하프</Text></View>
          <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: '#5856D6'}]} /><Text style={styles.legendText}>풀코스</Text></View>
        </View>
      </View>

      {/* 다가오는 일정 섹션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>다가오는 마라톤 일정</Text>
        {marathonData.map(event => (
          <TouchableOpacity key={event.id} style={styles.eventCard}>
            <View style={styles.dateInfo}>
              <Text style={[styles.eventDateText, { color: event.color }]}>{event.date.slice(5).replace('-', '.')}</Text>
            </View>
            <View style={styles.eventInfo}>
              <Text style={styles.eventName}>{event.name}</Text>
              <Text style={styles.eventLoc}>{event.loc}</Text>
            </View>
            <Text style={[styles.dday, { color: event.color }]}>D-{event.dday}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  header: { padding: 40, alignItems: 'center', backgroundColor: '#E1F5FE' },
  brand: { color: '#007AFF', fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold' },
  
  calendarCard: { backgroundColor: 'white', margin: 15, borderRadius: 20, padding: 15, elevation: 2 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  monthTitle: { fontSize: 18, fontWeight: 'bold' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  weekText: { fontSize: 12, color: '#666', width: 40, textAlign: 'center' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayBox: { width: '14.28%', height: 60, alignItems: 'center', paddingTop: 5 },
  dayText: { fontSize: 14, fontWeight: '500' },
  badge: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, marginRight: 3 },
  badgeText: { fontSize: 8, fontWeight: 'bold' },
  legend: { flexDirection: 'row', justifyContent: 'center', marginTop: 15, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 },
  legendText: { fontSize: 10, color: '#666' },

  section: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  eventCard: { backgroundColor: 'white', borderRadius: 15, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dateInfo: { width: 50 },
  eventDateText: { fontSize: 16, fontWeight: 'bold' },
  eventInfo: { flex: 1, marginLeft: 10 },
  eventName: { fontSize: 14, fontWeight: 'bold' },
  eventLoc: { fontSize: 11, color: '#888' },
  dday: { fontWeight: 'bold', marginRight: 5 }
});