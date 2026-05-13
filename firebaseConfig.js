import { initializeApp } from "firebase/app";
// 필요한 서비스에 따라 추가 (auth, firestore 등)
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase 콘솔에서 복사한 설정값들을 여기에 넣으세요
const firebaseConfig = {
  apiKey: "AIzaSyCZrih1X7qMJdMq0MNDql6i5rmpsKcCqv8",
  authDomain: "relaymate-4a161.firebaseapp.com",
  projectId: "relaymate-4a161",
  storageBucket: "relaymate-4a161.firebasestorage.app",
  messagingSenderId: "224703524118",
  appId: "1:224703524118:web:f7a78bd9cc8f9f0d8bf437",
  measurementId: "G-YLD1957F60"
}
// 앱 초기화
const app = initializeApp(firebaseConfig);

// 다른 파일에서 사용할 수 있도록 내보내기
export const db = getFirestore(app);
export const auth = getAuth(app);