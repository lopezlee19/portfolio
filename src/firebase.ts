import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, onSnapshot, query, orderBy, serverTimestamp, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Helper for auth
export const login = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

// Firestore operations
export { collection, addDoc, getDocs, onSnapshot, query, orderBy, serverTimestamp, doc, deleteDoc, updateDoc, setDoc };
