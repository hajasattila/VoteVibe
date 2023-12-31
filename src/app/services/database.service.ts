import { Injectable } from '@angular/core';
import { Firestore, collection, doc, getDocs, query, setDoc, where } from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { Room } from '../models/room';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  
  constructor(private firestore: Firestore) {}

  // Method to create a room in Firebase
  createRoom(room: Room): Observable<void> {
    // Create a reference for a new room, let Firestore generate the ID
    const roomRef = doc(collection(this.firestore, 'rooms'));
    
    // Use setDoc from Firestore to create the room
    return from(setDoc(roomRef, room));
  }

  roomIdExists(roomId: string): Observable<boolean> {
    const roomsRef = collection(this.firestore, 'rooms');
    const q = query(roomsRef, where('roomId', '==', roomId));
    
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.length > 0)  // If any documents are found, the roomId exists
    );
  }
}
