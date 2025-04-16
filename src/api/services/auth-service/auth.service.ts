import {Injectable} from "@angular/core";
import {
    Auth,
    signInWithEmailAndPassword,
    authState,
    createUserWithEmailAndPassword,
    UserCredential,
    sendPasswordResetEmail,
    User,
    GithubAuthProvider,
    signInWithPopup,
} from "@angular/fire/auth";
import {from, Observable, switchMap} from "rxjs";
import {ProfileUser} from "../../models/user.model";
import {Firestore, doc, getDoc, setDoc} from "@angular/fire/firestore";
import {CacheService} from "../cache-service/cache.service";

@Injectable({
    providedIn: "root",
})
export class AuthService {
    currentUser$ = authState(this.auth);

    constructor(private auth: Auth,
                private firestore: Firestore,
                private cache: CacheService
    ) {
    }

    loginWithGithub(): Observable<UserCredential | void> {
        const provider = new GithubAuthProvider();
        return from(signInWithPopup(this.auth, provider)).pipe(
            switchMap(async (credential) => {
                const uid = credential.user.uid;

                const userDocRef = doc(this.firestore, "users", uid);
                const userDocSnapshot = await getDoc(userDocRef);

                if (!userDocSnapshot.exists()) {
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
                    await setDoc(userDocRef, newUser);
                    return credential;
                } else {
                    return credential;
                }
            })
        );
    }

    getCurrentUser(): Observable<User | null> {
        return this.currentUser$;
    }

    // getCurrentUserUID(): Observable<string | null> {
    //   return this.currentUser$.pipe(
    //     map((user) => (user ? user.uid : null))
    //   );
    // }

    signUp(email: string, password: string): Observable<UserCredential> {
        return from(createUserWithEmailAndPassword(this.auth, email, password));
    }

    login(email: string, password: string): Observable<any> {
        return from(signInWithEmailAndPassword(this.auth, email, password));
    }

    resetPassword(email: string): Observable<any> {
        return from(sendPasswordResetEmail(this.auth, email));
    }

    logout(): Observable<any> {
        this.cache.clear();
        return from(this.auth.signOut());
    }
}

export function generateRandomUsername(minLength: number, maxLength: number): string {
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    const chars = "abcdefghijklmnopqrstuvwxyz";
    let username = "";
    for (let i = 0; i < length; i++) {
        username += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return username;
}

// export function createUserProfile(user: ProfileUser, firestore: Firestore): Observable<any> {
//   const userRef = doc(firestore, "users", user.uid);
//   return from(setDoc(userRef, user));
// }
