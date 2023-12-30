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
  User, // Importáld be a szükséges modult
} from "@angular/fire/auth";
import { concatMap, from, map, Observable, of, switchMap } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  currentUser$ = authState(this.auth);

  constructor(private auth: Auth) {}

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
