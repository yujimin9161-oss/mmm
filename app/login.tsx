// app/login.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ImageBackground, StatusBar, ScrollView } from 'react-native';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // 외부 PNG 대신 내장 벡터 아이콘 사용

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("알림", "이메일과 비밀번호를 입력해주세요.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      Alert.alert("로그인 실패", "이메일 또는 비밀번호를 확인해주세요.");
    }
  };

  return (
    <ImageBackground
      source={require('../assets/images/background.png')} // 배경 PNG 딱 하나만 불러옵니다. (경로가 다르면 수정 가능)
      style={styles.background}
      resizeMode="cover"
      // 👇 흰색 폼은 그대로 두고, 배경 이미지만 줄이고 위로 올리도록 imageStyle을 추가했습니다.
      imageStyle={{
        height: '80%', // 배경 이미지의 높이를 줄여서 전체를 덮지 않게 함 (필요시 '70%' 등으로 조절)
        top: -30,      // 배경 이미지를 위로 살짝 끌어올림 (음수 값을 더 키우면 더 위로 올라감)
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* 상단 빈 공간을 두어 배경화면이 자연스럽게 노출되도록 설정 */}
        <View style={styles.spacer} />

        {/* 하단 로그인 카드 구역 */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>다시 만나서 반가워요!</Text>
          <Text style={styles.subtitle}>계정에 로그인하고 러닝을 계속해보세요.</Text>

          {/* 이메일 입력 필드 */}
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

          {/* 비밀번호 입력 필드 */}
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={22} color="#A0A0A0" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="비밀번호"
              placeholderTextColor="#A0A0A0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!isPasswordVisible}
            />
            <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.passwordVisibilityIcon}>
              <Ionicons name={isPasswordVisible ? "eye-outline" : "eye-off-outline"} size={22} color="#A0A0A0" />
            </TouchableOpacity>
          </View>

          {/* 로그인 상태 유지 및 비밀번호 찾기 */}
          <View style={styles.additionalControls}>
            <TouchableOpacity style={styles.stayLoggedIn} onPress={() => setStayLoggedIn(!stayLoggedIn)}>
              <Ionicons
                name={stayLoggedIn ? "checkbox" : "square-outline"}
                size={20}
                color={stayLoggedIn ? "#2F80ED" : "#A0A0A0"}
              />
              <Text style={styles.stayLoggedInText}>로그인 상태 유지</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {}}>
              <Text style={styles.findPasswordLink}>비밀번호 찾기</Text>
            </TouchableOpacity>
          </View>

          {/* 로그인 버튼 */}
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.btnText}>로그인</Text>
          </TouchableOpacity>

          {/* 또는 구분선 */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 소셜 로그인 버튼 (이미지 파일 없이 내장 아이콘 벡터로 처리) */}
          <TouchableOpacity style={styles.socialBtn}>
            <Ionicons name="logo-google" size={20} color="#EA4335" style={styles.socialIcon} />
            <Text style={styles.socialBtnText}>Google로 로그인</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialBtn}>
            <Ionicons name="logo-apple" size={20} color="#000000" style={styles.socialIcon} />
            <Text style={styles.socialBtnText}>Apple로 로그인</Text>
          </TouchableOpacity>

          {/* 회원가입 링크 */}
          <View style={styles.signUpLinkContainer}>
            <Text style={styles.signUpLinkPreText}>계정이 없으신가요?</Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.signUpLinkMainText}>회원가입</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '90%',
    top: 30,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  spacer: {
    height: 320,// 이 값을 높이면 흰색 창이 아래로 내려가고, 줄이면 위로 올라옵니다.
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 30,
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 35,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 16,
    height: 56,
    backgroundColor: '#fff',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  passwordVisibilityIcon: {
    padding: 5,
  },
  additionalControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 2,
  },
  stayLoggedIn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stayLoggedInText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 6,
  },
  findPasswordLink: {
    fontSize: 14,
    color: '#2F80ED',
  },
  loginBtn: {
    backgroundColor: '#2F80ED', // 이미지와 유사한 선명한 블루 색상 적용
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#2F80ED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EDF2F7',
  },
  dividerText: {
    fontSize: 14,
    color: '#A0AEC0',
    paddingHorizontal: 15,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 52,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  socialIcon: {
    marginRight: 10,
  },
  socialBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
  },
  signUpLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 20,
  },
  signUpLinkPreText: {
    fontSize: 14,
    color: '#64748B',
    marginRight: 6,
  },
  signUpLinkMainText: {
    fontSize: 14,
    color: '#2F80ED',
    fontWeight: 'bold',
  },
});