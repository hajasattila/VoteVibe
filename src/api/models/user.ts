import {Room} from "./room";
import {RoomInvite} from "./roomInvitation";

export interface ProfileUser {
    uid: string;
    email?: string | null;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    phone?: string;
    photoURL?: string;
    description?: string;
    friendList?: ProfileUser[];
    games?: number;
    polls?: number;
    friendRequests?: string[];
    sentFriendRequests?: string[];
    gameRooms?: Room[];
    pendingInvites?: RoomInvite[];
}

