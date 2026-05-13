import { Stack, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from '../firebaseConfig'; // 경로는 본인의 설정에 맞게 확인

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Firebase 인증 상태 관찰
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (initializing) return;

    // 현재 사용자가 (tabs) 그룹 안에 있는지 확인
    const inTabsGroup = segments[0] === '(tabs)';

    if (!user && inTabsGroup) {
      // 로그인이 안 되어 있는데 메인 화면에 있다면 로그인으로 이동
      router.replace('/login');
    } else if (user && segments[0] === 'login') {
      // 로그인이 되었는데 로그인 화면에 있다면 메인으로 이동
      router.replace('/(tabs)');
    }
  }, [user, segments, initializing]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* 로그인 페이지 */}
      <Stack.Screen name="login" options={{ headerShown: false }} />
      {/* 메인 탭 그룹 */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}