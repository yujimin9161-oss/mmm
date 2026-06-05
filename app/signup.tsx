// app/signup.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, StatusBar, ScrollView, SafeAreaView } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const router = useRouter();

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("알림", "모든 정보를 입력해주세요.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("알림", "비밀번호는 6자리 이상이어야 합니다.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("알림", "비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: email,
        level: 1,
        exp: 0,
        totalDistance: 0,
        createdAt: serverTimestamp()
      });

      Alert.alert("성공", "회원가입이 완료되었습니다!", [
        { text: "확인", onPress: () => router.replace('/login') }
      ]);
    } catch (error: any) {
      Alert.alert("회원가입 실패", error.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        
        <Text style={styles.title}>만나서 반가워요!</Text>
        <Text style={styles.subtitle}>새로운 러닝 파트너가 되어보세요.</Text>

        {/* 이메일 */}
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={22} color="#A0A0A0" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="이메일 주소"
            placeholderTextColor="#A0A0A0"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* 비밀번호 */}
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={22} color="#A0A0A0" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="비밀번호 (6자 이상)"
            placeholderTextColor="#A0A0A0"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!isPasswordVisible}
          />
        </View>

        {/* 비밀번호 확인 */}
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={22} color="#A0A0A0" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="비밀번호 확인"
            placeholderTextColor="#A0A0A0"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!isPasswordVisible}
          />
          <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.passwordVisibilityIcon}>
            <Ionicons name={isPasswordVisible ? "eye-outline" : "eye-off-outline"} size={22} color="#A0A0A0" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signUpBtn} onPress={handleSignUp}>
          <Text style={styles.btnText}>가입하기</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.linkContainer}>
          <Text style={styles.linkPreText}>이미 계정이 있으신가요?</Text>
          <Text style={styles.linkMainText}>로그인</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 30 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748B', marginBottom: 35 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 15, borderRadius: 12, marginBottom: 16, height: 56, backgroundColor: '#fff' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#1E293B' },
  passwordVisibilityIcon: { padding: 5 },
  signUpBtn: { backgroundColor: '#2F80ED', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  linkContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  linkPreText: { fontSize: 14, color: '#64748B', marginRight: 6 },
  linkMainText: { fontSize: 14, color: '#2F80ED', fontWeight: 'bold' }
});