import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from '@/firebase/config';

export type UserRole = 'citizen' | 'officer' | 'department_head' | 'administrator';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  emailVerified: boolean;
}

async function ensureUserProfile(firebaseUser: User, fallbackRole: UserRole = 'citizen') {
  if (!isFirebaseConfigured || !db) {
    return;
  }

  const userRef = doc(db, 'users', firebaseUser.uid);
  const existing = await getDoc(userRef);

  if (!existing.exists()) {
    await setDoc(userRef, {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || firebaseUser.email || 'CityBrain user',
      photoURL: firebaseUser.photoURL || null,
      role: fallbackRole,
      emailVerified: firebaseUser.emailVerified,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'active',
    });
  } else {
    await setDoc(
      userRef,
      {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || existing.data().displayName || firebaseUser.email || 'CityBrain user',
        photoURL: firebaseUser.photoURL || existing.data().photoURL || null,
        emailVerified: firebaseUser.emailVerified,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
}

export async function signInWithGoogle() {
  if (!isFirebaseConfigured || !auth || !googleProvider) {
    throw new Error('Firebase authentication is not configured for this environment.');
  }

  const result = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(result.user, 'citizen');
}

export async function signInWithEmail(email: string, password: string) {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase authentication is not configured for this environment.');
  }

  const result = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(result.user, 'citizen');
}

export async function registerWithEmail(email: string, password: string, displayName: string, role: UserRole = 'citizen') {
  if (!isFirebaseConfigured || !auth || !db) {
    throw new Error('Firebase authentication is not configured for this environment.');
  }

  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (result.user) {
    await ensureUserProfile(result.user, role);
    await setDoc(
      doc(db, 'users', result.user.uid),
      {
        displayName,
        role,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    await sendEmailVerification(result.user);
  }
}

export async function resetPassword(email: string) {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase authentication is not configured for this environment.');
  }

  await sendPasswordResetEmail(auth, email);
}

export async function logout() {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase authentication is not configured for this environment.');
  }

  await signOut(auth);
}

export function observeAuth(onChange: (user: AppUser | null) => void) {
  if (!isFirebaseConfigured || !auth) {
    onChange({
      uid: 'local-demo-user',
      email: 'demo@citybrain.local',
      displayName: 'Local Demo User',
      photoURL: null,
      role: 'citizen',
      emailVerified: true,
    });
    return () => undefined;
  }

  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      onChange(null);
      return;
    }

    if (!db) {
      onChange({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        role: 'citizen',
        emailVerified: firebaseUser.emailVerified,
      });
      return;
    }

    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    const role = (userDoc.exists() ? (userDoc.data().role as UserRole) : 'citizen') || 'citizen';

    onChange({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      role,
      emailVerified: firebaseUser.emailVerified,
    });
  });
}

export function getRoleRedirect(role: UserRole) {
  switch (role) {
    case 'administrator':
      return '/admin';
    case 'department_head':
      return '/analytics';
    case 'officer':
      return '/dashboard';
    default:
      return '/report';
  }
}
