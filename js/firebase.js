const firebaseConfig = {
  apiKey: "AIzaSyBl98YMadTu7V8XJQrinkLiQpxNuIPQknY",
  authDomain: "expense-tracker-b8958.firebaseapp.com",
  projectId: "expense-tracker-b8958",
  storageBucket: "expense-tracker-b8958.firebasestorage.app",
  messagingSenderId: "1064106482496",
  appId: "1:1064106482496:web:9efd5955e3dabf1f43b8a5",
  databaseURL: "https://expense-tracker-b8958-default-rtdb.firebaseio.com"
};

firebase.initializeApp(firebaseConfig);

export const auth = firebase.auth();
export const db = firebase.database();
