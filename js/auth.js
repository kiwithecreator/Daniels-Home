import { auth } from './firebase.js';

function sessionLogin() {
  const email = document.getElementById('session-email').value.trim();
  const password = document.getElementById('session-password').value;
  const err = document.getElementById('session-error');
  err.textContent = '';
  auth.signInWithEmailAndPassword(email, password)
    .catch(() => { err.textContent = 'Incorrect email or password.'; });
}

window.sessionLogin = sessionLogin;
