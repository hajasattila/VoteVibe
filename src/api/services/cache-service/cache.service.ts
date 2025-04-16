import {Injectable} from '@angular/core';
import {RoomModel} from "../../models/room.model";
import {ProfileUser} from "../../models/user.model";

@Injectable({ providedIn: 'root' })
export class CacheService {

    private roomCache: RoomModel[] | null = null;
    private friendCache: ProfileUser[] | null = null;
    private friendUid: string | null = null;

    private imageCache = new Set<string>();

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

    preloadImages(urls: string[]): void {
        urls.forEach(url => {
            if (!this.imageCache.has(url)) {
                const img = new Image();
                img.src = url;
                img.onload = () => this.imageCache.add(url);
                img.onerror = () => console.warn('[Kép betöltési hiba]', url);
            }
        });
    }

    isImagePreloaded(url: string): boolean {
        return this.imageCache.has(url);
    }

    clear(): void {
        this.roomCache = null;
        this.friendCache = null;
        this.friendUid = null;
        this.imageCache.clear();
    }
}

