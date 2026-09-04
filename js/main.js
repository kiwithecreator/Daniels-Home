import { auth } from './firebase.js';
import './auth.js';
import * as tabs from './tabs.js';
import * as expenses from './features/expenses.js';
import * as grocery from './features/grocery.js';

let tabsInitialized = false;

function showApp() {
  if (!tabsInitialized) {
    tabs.register(expenses);
    tabs.register(grocery);
    tabs.init();
    tabsInitialized = true;
  }
  tabs.show();
  expenses.checkDueRecurring();
}

auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById('session-expired-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    showApp();
  } else {
    document.getElementById('session-expired-screen').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
