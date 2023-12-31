import { Room } from "./room";
import { RoomInvitation } from "./roomInvitation";

export interface ProfileUser {
  uid: string ;
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
  gameRooms?: Room[]; // Array of Room objects the user is part of
  roomInvitations?: RoomInvitation[]; // Invitations for the user to join game rooms
}

