import { Injectable } from "@angular/core";
import { collection, doc, docData, Firestore, getDoc, setDoc, updateDoc, collectionData, arrayUnion, arrayRemove } from "@angular/fire/firestore";
import { catchError, filter, from, map, Observable, of, switchMap, throwError } from "rxjs";
import { ProfileUser } from "../models/user";
import { AuthService } from "./auth.service";
import { runTransaction } from "firebase/firestore";
import { HotToastService } from "@ngneat/hot-toast";

@Injectable({
  providedIn: "root",
})
export class UsersService {
  constructor(private firestore: Firestore, private authService: AuthService, private toast: HotToastService) {}

  get currentUserProfile$(): Observable<ProfileUser | null> {
    return this.authService.currentUser$.pipe(
      switchMap((user) => {
        if (!user?.uid) {
          return of(null);
        }

        const ref = doc(this.firestore, "users", user?.uid);
        return docData(ref) as Observable<ProfileUser>;
      })
    );
  }

  addUser(user: ProfileUser): Observable<void> {
    const ref = doc(this.firestore, "users", user.uid);
    return from(setDoc(ref, user));
  }

  updateUser(user: ProfileUser): Observable<void> {
    const ref = doc(this.firestore, "users", user.uid);
    return from(updateDoc(ref, { ...user }));
  }

  getFilteredUsers(query: string): Observable<ProfileUser[]> {
    const usersRef = collection(this.firestore, "users");
    return collectionData(usersRef, { idField: "uid" }).pipe(
      map((users: any[]) =>
        users.map(
          (user: any) =>
            ({
              uid: user.uid,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              displayName: user.displayName,
              phone: user.phone,
              address: user.address,
              photoURL: user.photoURL,
              description: user.description,
              friendList: user.friendList,
              games: user.games,
              polls: user.polls,
            } as ProfileUser)
        )
      ),
      map((users: ProfileUser[]) => users.filter((user) => user.displayName?.toLowerCase().includes(query.toLowerCase())))
    );
  }

  sendFriendRequest(currentUserId: string, friendId: string): Observable<any> {
    return this.authService.currentUser$.pipe(
      switchMap((currentUser) => {
        if (!currentUser?.uid) {
          throw new Error("You must be logged in to send friend requests.");
        }

        const friendUserRef = doc(this.firestore, "users", friendId);

        // Convert the Promise returned by getDoc() to an Observable
        return from(getDoc(friendUserRef)).pipe(
          switchMap((friendDoc) => {
            // Asserting the type of data returned by friendDoc.data()
            const friendData = friendDoc.data() as ProfileUser; // Replace with your actual user data type

            if (friendData?.friendList?.some((friend: any) => friend.uid === currentUserId)) {
              return throwError(() => new Error("Users are already friends"));
            } else {
              return from(
                updateDoc(friendUserRef, {
                  friendRequests: arrayUnion(currentUserId),
                })
              );
            }
          }),
          catchError((error) => {
            return throwError(() => error);
          })
        );
      })
    );
  }

  acceptFriendRequest(currentUserId: string, requestingUserId: string): Observable<void> {
    const currentUserDocRef = doc(this.firestore, `users/${currentUserId}`);
    const requestingUserDocRef = doc(this.firestore, `users/${requestingUserId}`);

    return from(
      runTransaction(this.firestore, async (transaction) => {
        const requestingUserDoc = await transaction.get(requestingUserDocRef);
        const currentUserDoc = await transaction.get(currentUserDocRef);

        if (requestingUserDoc.exists() && currentUserDoc.exists()) {
          const requestingUser = requestingUserDoc.data();
          const currentUser = currentUserDoc.data();

          // Add each other to their friendLists
          transaction.update(currentUserDocRef, {
            friendList: arrayUnion({ uid: requestingUserId, displayName: requestingUser["displayName"] }),
            friendRequests: arrayRemove(requestingUserId),
          });
          transaction.update(requestingUserDocRef, {
            friendList: arrayUnion({ uid: currentUserId, displayName: currentUser["displayName"] }),
          });
        } else {
          console.error("One or both users not found");
          // Handle the error appropriately
        }
      })
    );
  }

  getUserById(uid: string): Observable<ProfileUser> {
    const userDocRef = doc(this.firestore, `users/${uid}`);
    return docData(userDocRef) as Observable<ProfileUser>;
  }

  hasAlreadySentRequest(currentUserId: string, potentialFriendId: string): Observable<boolean> {
    return this.getUserById(currentUserId).pipe(map((user) => user?.sentFriendRequests?.includes(potentialFriendId) || false));
  }

  rejectFriendRequest(currentUserId: string, requestingUserId: string): Observable<void> {
    const currentUserDocRef = doc(this.firestore, `users/${currentUserId}`);

    // Remove the requesting user's ID from the current user's friendRequests array
    return from(
      updateDoc(currentUserDocRef, {
        friendRequests: arrayRemove(requestingUserId),
      })
    );
  }
  removeFriend(friend: ProfileUser): Observable<void> {
    return this.authService.currentUser$.pipe(
      switchMap((currentUser) => {
        if (!currentUser || !currentUser.uid) {
          // If no logged-in user or no UID, throw an error
          return throwError(() => new Error("You must be logged in to remove friends."));
        }
        // Referenciák a dokumentumokhoz
        const currentUserDocRef = doc(this.firestore, `users/${currentUser.uid}`);
        const friendDocRef = doc(this.firestore, `users/${friend.uid}`);

        // Tranzakció létrehozása a mindkét user friendList-jének frissítésére
        return from(
          runTransaction(this.firestore, async (transaction) => {
            // Eltávolítja a barátot az aktuális felhasználó friendList-jéből
            transaction.update(currentUserDocRef, {
              friendList: arrayRemove({ uid: friend.uid, displayName: friend.displayName }),
            });
            // Eltávolítja az aktuális felhasználót a barát friendList-jéből
            transaction.update(friendDocRef, {
              friendList: arrayRemove({ uid: currentUser.uid, displayName: currentUser.displayName }),
            });
          })
        );
      }),
      catchError((error) => {
        // Handle the error
        console.error("Error removing friend:", error);
        return throwError(() => error);
      })
    );
  }
  isDisplayNameTaken(displayName: string, currentUserId: string): Observable<boolean> {
    return this.getFilteredUsers(displayName).pipe(
      map(users => users.some(user => user.uid !== currentUserId && user.displayName?.toLowerCase() === displayName.toLowerCase()))
    );
  }
}
