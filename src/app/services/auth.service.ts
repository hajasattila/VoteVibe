import { Injectable } from "@angular/core";
import {
  Auth,
  signInWithEmailAndPassword,
  authState,
  createUserWithEmailAndPassword,
  updateProfile,
  UserInfo,
  UserCredential,
  sendPasswordResetEmail,
  User,
  GithubAuthProvider,
  signInWithPopup, // Importáld be a szükséges modult
} from "@angular/fire/auth";
import { concatMap, from, map, Observable, of, switchMap } from "rxjs";
import { ProfileUser } from "../models/user";
import { Firestore, doc, getDoc, setDoc } from "@angular/fire/firestore"; // Import Firestore

@Injectable({
  providedIn: "root",
})
export class AuthService {
  currentUser$ = authState(this.auth);

  constructor(private auth: Auth, private firestore: Firestore) {}

  // Function to handle GitHub login
  loginWithGithub(): Observable<UserCredential | void> {
    const provider = new GithubAuthProvider();
    return from(signInWithPopup(this.auth, provider)).pipe(
      switchMap(async (credential) => {
        const uid = credential.user.uid; // Get the UID from the user credential

        const userDocRef = doc(this.firestore, "users", uid); // Reference to the user's document in Firestore
        const userDocSnapshot = await getDoc(userDocRef); // Get the document snapshot

        if (!userDocSnapshot.exists()) {
          // If the user does not exist, create a new user profile
          const newUser: ProfileUser = {
            uid: uid,
            email: null, 
            firstName: "", 
            lastName: "",
            displayName: generateRandomUsername(6, 12), 
            phone: "", 
            photoURL: "../assets/images/image-placeholder.png",
            description: "",
            friendList: [],
            games: 0,
            polls: 0,
            friendRequests: [],
            sentFriendRequests: [], 
          };
          await setDoc(userDocRef, newUser); // Create the user profile in Firestore
          return credential;
        } else {
          // User already exists
          return credential;
        }
      })
    );
  }

  getCurrentUser(): Observable<User | null> {
    return this.currentUser$; // Visszaadja az aktuális User objektumot vagy null-t
  }

  // AuthService
  getCurrentUserUID(): Observable<string | null> {
    return this.currentUser$.pipe(
      map((user) => (user ? user.uid : null)) // Visszaadja az aktuális felhasználó UID-jét, vagy null-t, ha nincs bejelentkezve
    );
  }

  signUp(email: string, password: string): Observable<UserCredential> {
    return from(createUserWithEmailAndPassword(this.auth, email, password));
  }

  login(email: string, password: string): Observable<any> {
    return from(signInWithEmailAndPassword(this.auth, email, password));
  }

  resetPassword(email: string): Observable<any> {
    return from(sendPasswordResetEmail(this.auth, email)); // Elküldi a jelszó visszaállítási emailt
  }

  logout(): Observable<any> {
    return from(this.auth.signOut());
  }
}
// Function to generate a random username
export function generateRandomUsername(minLength: number, maxLength: number): string {
  const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
  const chars = "abcdefghijklmnopqrstuvwxyz"; // Characters to include
  let username = "";
  for (let i = 0; i < length; i++) {
    username += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return username;
}

export function createUserProfile(user: ProfileUser, firestore: Firestore): Observable<any> {
  const userRef = doc(firestore, "users", user.uid);
  return from(setDoc(userRef, user));
}
