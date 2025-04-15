import {Injectable} from '@angular/core';
import {RoomModel} from "../../models/room.model";
import {ProfileUser} from "../../models/user.model";

@Injectable({providedIn: 'root'})
export class CacheService {

    private roomCache: RoomModel[] | null = null;
    private friendCache: ProfileUser[] | null = null;
    private friendUid: string | null = null;

    setRooms(rooms: RoomModel[]) {
        this.roomCache = rooms;
    }

    getRooms(): RoomModel[] | null {
        return this.roomCache;
    }

    setFriends(uid: string, friends: ProfileUser[]) {
        this.friendUid = uid;
        this.friendCache = friends;
    }

    getFriends(uid: string): ProfileUser[] | null {
        if (this.friendUid === uid) {
            return this.friendCache;
        }
        return null;
    }

    clear() {
        this.roomCache = null;
        this.friendCache = null;
        this.friendUid = null;
    }
}
