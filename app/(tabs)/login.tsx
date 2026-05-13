import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("알림", "이메일과 비밀번호를 입력해주세요.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // 로그인 성공 시 _layout.tsx의 로직에 의해 자동으로 화면이 전환됩니다.
    } catch (error: any) {
      Alert.alert("로그인 실패", error.message);
    }
  };

  const handleSignUp = async () => {
    if (password.length < 6) {
      Alert.alert("알림", "비밀번호는 6자리 이상이어야 합니다.");
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
      Alert.alert("성공", "회원가입이 완료되었습니다! 이제 로그인 해주세요.");
    } catch (error: any) {
      Alert.alert("회원가입 실패", error.message);
    }
  };

  // [중요] 함수의 끝은 이 return 문이 끝난 뒤에 와야 합니다.
  return (
    <View style={styles.container}>
      <Text style={styles.title}>RelayMate</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="이메일" 
        value={email} 
        onChangeText={setEmail} 
        autoCapitalize="none"
      />
      
      <TextInput 
        style={styles.input} 
        placeholder="비밀번호" 
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry 
      />
      
      <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
        <Text style={styles.btnText}>로그인</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={handleSignUp}>
        <Text style={{ textAlign: 'center', marginTop: 15, color: '#4A148C' }}>
          계정이 없으신가요? 회원가입
        </Text>
      </TouchableOpacity>
    </View>
  );
} // <--- LoginScreen 함수의 끝

// 스타일 정의는 반드시 함수 밖(아래쪽)에 위치해야 합니다.
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 30, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#4A148C', marginBottom: 40, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, marginBottom: 15 },
  loginBtn: { backgroundColor: '#4A148C', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});