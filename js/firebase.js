const firebaseConfig = {
  apiKey: "AIzaSyA0ZmztyKdOiADQicO08d0uu1E8HKvL0bw",
  authDomain: "daniels-home-3a47c.firebaseapp.com",
  projectId: "daniels-home-3a47c",
  storageBucket: "daniels-home-3a47c.firebasestorage.app",
  messagingSenderId: "1009330492033",
  appId: "1:1009330492033:web:aad2ccfc504f39c6c67380",
  databaseURL: "https://daniels-home-3a47c-default-rtdb.firebaseio.com"
};

firebase.initializeApp(firebaseConfig);

export const auth = firebase.auth();
export const db = firebase.database();
