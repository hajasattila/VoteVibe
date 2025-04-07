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
import {Observable, from, map, switchMap} from "rxjs";
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

    async savePollResultToRoom(roomDocId: string, result: Record<string, Record<string, number>>, userUid: string): Promise<void> {
        const roomRef = doc(this.firestore, 'rooms', roomDocId);
        const userVotes = Object.values(result)[0];

        await updateDoc(roomRef, {
            [`pollResults.${userUid}`]: userVotes
        });
    }


    async removePollResultFromRoom(roomDocId: string, userKey: string): Promise<void> {
        const roomRef = doc(this.firestore, 'rooms', roomDocId);
        await updateDoc(roomRef, {
            [`pollResults.${userKey}`]: null
        });
    }

    addUserToRoomByCode(code: string, user: ProfileUser): Observable<void> {
        return this.getRoomDocRefByCode(code).pipe(
            switchMap((roomRef) => from(updateDoc(roomRef, {
                members: arrayUnion(user)
            })))
        );
    }

    getRoomsForUser(userUid: string): Observable<(Room & { isCreator: boolean })[]> {
        const roomsRef = collection(this.firestore, 'rooms');
        const q = query(roomsRef);

        return from(getDocs(q)).pipe(
            map(snapshot => {
                return snapshot.docs
                    .map(doc => {
                        const room = doc.data() as Room;
                        const isMember = room.members?.some(member => member.uid === userUid);
                        const isCreator = room.creator?.uid === userUid;

                        if (isMember) {
                            return {
                                ...room,
                                docId: doc.id,
                                isCreator
                            } as Room & { isCreator: boolean };
                        }

                        return null;
                    })
                    .filter((room): room is Room & { isCreator: boolean } => room !== null);
            })
        );
    }
}