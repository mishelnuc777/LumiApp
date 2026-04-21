import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, limit, onSnapshot, getDocFromServer, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = () => signOut(auth);

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export interface UserProfile {
  userId: string;
  pseudonym: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  isVerifiedNurse: boolean;
  createdAt: any;
  followersCount: number;
  followingCount: number;
  karma: number; // Reddit-style trust system
  savedPosts: string[];
}

export const generatePseudonym = () => {
  const adjectives = ['Veloz', 'Atento', 'Sereno', 'Ágil', 'Capaz', 'Fiel', 'Noble', 'Clínico', 'Vital', 'Sutil'];
  const nouns = ['Enfermero', 'Sanitario', 'Héroe', 'Mentor', 'Guía', 'Experto', 'Aliado', 'Técnico', 'Auxiliar', 'Residente'];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${num}`;
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const docRef = doc(db, "users", userId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
};

export const createUserProfile = async (userId: string, data: Partial<UserProfile>) => {
  const docRef = doc(db, "users", userId);
  await setDoc(docRef, {
    userId,
    ...data,
    createdAt: new Date().toISOString(),
    followersCount: 0,
    followingCount: 0,
    karma: 100, // Initial trust
    savedPosts: [],
    isVerifiedNurse: false,
  }, { merge: true });
};

export const savePost = async (userId: string, postId: string) => {
  const docRef = doc(db, "users", userId);
  await updateDoc(docRef, {
    savedPosts: arrayUnion(postId)
  });
};

export const unsavePost = async (userId: string, postId: string) => {
  const docRef = doc(db, "users", userId);
  await updateDoc(docRef, {
    savedPosts: arrayRemove(postId)
  });
};
