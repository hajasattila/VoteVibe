import { Injectable } from "@angular/core";
import { Firestore, arrayUnion, collection, doc, getDocs, query, setDoc, updateDoc, where } from "@angular/fire/firestore";
import { Observable, from, map } from "rxjs";
import { Room } from "../models/room";
import { ProfileUser } from "../models/user";

@Injectable({
  providedIn: "root",
})
export class DatabaseService {
  constructor(private firestore: Firestore) {}

  // Method to create a room in Firebase
  createRoom(room: Room): Observable<void> {
    // Create a reference for a new room, let Firestore generate the ID
    const roomRef = doc(collection(this.firestore, "rooms"));

    // Use setDoc from Firestore to create the room
    return from(setDoc(roomRef, room));
  }

  roomIdExists(roomId: string): Observable<boolean> {
    const roomsRef = collection(this.firestore, "rooms");
    const q = query(roomsRef, where("roomId", "==", roomId));

    return from(getDocs(q)).pipe(
      map((snapshot) => snapshot.docs.length > 0) // If any documents are found, the roomId exists
    );
  }

  getRoomByCode(code: string): Observable<Room | null> {
    const roomsRef = collection(this.firestore, "rooms");
    const q = query(roomsRef, where("connectionCode", "==", code));
    return from(getDocs(q)).pipe(
      map((snapshot) => {
        if (snapshot.docs.length > 0) {
          const roomData = snapshot.docs[0].data() as Room;
          const docId = snapshot.docs[0].id;
          return { ...roomData, docId }; // Adjuk hozzá a docId-t a visszaadott objektumhoz
        }
        return null;
      })
    );
  }

  updateRoomMembers(docId: string, newMember: ProfileUser): Observable<void> {
    const roomRef = doc(this.firestore, "rooms", docId);
    // Használjuk a Firestore arrayUnion funkcióját a tömb frissítésére
    return from(
      updateDoc(roomRef, {
        members: arrayUnion(newMember),
      })
    );
  }
}
