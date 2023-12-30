export interface ProfileUser {
  uid: string ;
  email?: string | null;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  address?: string;
  photoURL?: string;
  description?: string;
  friendList?: ProfileUser[];
  games?: number;
  polls?: number;
  friendRequests?: string[];
  sentFriendRequests?: string[];
}

