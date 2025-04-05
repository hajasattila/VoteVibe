import {Injectable} from "@angular/core";
import {
    Firestore,
    arrayUnion,
    collection,
    doc,
    getDocs,
    query,
    setDoc,
    updateDoc,
    where,
    DocumentReference
} from "@angular/fire/firestore";
import {Observable, from, map} from "rxjs";
import {Room, textPoll} from "../../models/room";
import {ProfileUser} from "../../models/user";

@Injectable({
    providedIn: "root",
})
export class DatabaseService {
    constructor(private firestore: Firestore) {
    }

    createRoom(room: Room): Observable<void> {
        const roomRef = doc(collection(this.firestore, "rooms"));
        return from(setDoc(roomRef, room));
    }

    roomIdExists(roomId: string): Observable<boolean> {
        const roomsRef = collection(this.firestore, "rooms");
        const q = query(roomsRef, where("roomId", "==", roomId));

        return from(getDocs(q)).pipe(
            map((snapshot) => snapshot.docs.length > 0)
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
                    return {...roomData, docId};
                }
                return null;
            })
        );
    }

    getRoomDocRefByCode(code: string): Observable<DocumentReference> {
        const roomsRef = collection(this.firestore, "rooms");
        const q = query(roomsRef, where("connectionCode", "==", code));

        return from(getDocs(q)).pipe(
            map(snapshot => {
                if (snapshot.empty) {
                    throw new Error("Room not found with given code.");
                }
                return snapshot.docs[0].ref;
            })
        );
    }

    updateRoomMembers(docId: string, newMember: ProfileUser): Observable<void> {
        const roomRef = doc(this.firestore, "rooms", docId);
        return from(
            updateDoc(roomRef, {
                members: arrayUnion(newMember),
            })
        );
    }

    addPollToRoom(docId: string, poll: textPoll): Observable<void> {
        const roomRef = doc(this.firestore, "rooms", docId);
        return from(updateDoc(roomRef, {poll}));
    }

    updateRoomPollState(docId: string, pollCreated: boolean): Observable<void> {
        const roomRef = doc(this.firestore, "rooms", docId);
        return from(updateDoc(roomRef, {pollCreated}));
    }

    async savePollResultToRoom(roomDocId: string, result: Record<string, Record<string, number>>): Promise<void> {
        const roomRef = doc(this.firestore, 'rooms', roomDocId);
        const userKey = Object.keys(result)[0];
        const userVotes = result[userKey];

        await updateDoc(roomRef, {
            [`pollResults.${userKey}`]: userVotes
        });
    }

    async removePollResultFromRoom(roomDocId: string, userKey: string): Promise<void> {
        const roomRef = doc(this.firestore, 'rooms', roomDocId);
        await updateDoc(roomRef, {
            [`pollResults.${userKey}`]: null
        });
    }


}
