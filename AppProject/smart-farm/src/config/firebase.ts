import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCvc7Af9rnYjP1DprhH18MHo7O2GIJzgkQ',
  authDomain: 'mobile-260c9.firebaseapp.com',
  databaseURL: 'https://mobile-260c9-default-rtdb.firebaseio.com',
  projectId: 'mobile-260c9',
  storageBucket: 'mobile-260c9.firebasestorage.app',
  messagingSenderId: '794898314163',
  appId: '1:794898314163:web:f93d3b894ec8f92ebf11c6',
};

const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);
export const auth = getAuth(app);