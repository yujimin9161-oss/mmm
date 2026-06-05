import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, setLogLevel, Firestore } from "firebase/firestore"; // 🌟 Firestore 타입 추가


const firebaseConfig = {
  apiKey: "AIzaSyCZrih1X7qMJdMq0MNDql6i5rmpsKcCqv8",
  authDomain: "relaymate-4a161.firebaseapp.com",
  projectId: "relaymate-4a161",
  storageBucket: "relaymate-4a161.firebasestorage.app",
  messagingSenderId: "224703524118",
  appId: "1:224703524118:web:f7a78bd9cc8f9f0d8bf437",
  measurementId: "G-YLD1957F60"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 🌟 변수를 선언할 때 기본값으로 getFirestore(app)를 바로 넣어줍니다.
// 이렇게 하면 에디터가 "아, db는 무조건 확실한 Firestore 인스턴스구나!"라고 인식해서 빨간 줄을 지웁니다.
let db: Firestore = getFirestore(app); 

try {
  // 그 후 롱폴링 옵션으로 재초기화를 시도합니다.
  db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  });
} catch (error) {
  // 이미 초기화 되었다면 위에서 할당된 기본 getFirestore(app)를 그대로 사용하므로 여기선 아무것도 안 해도 안전합니다.
}

setLogLevel('silent'); 

export { db };
export const auth = getAuth(app);