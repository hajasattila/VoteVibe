import { ProfileUser } from "./user";

// room.model.ts
export interface Creator {
  description: string;
  displayName: string;
  // Add további mezőket, ha szükséges
}

export interface Room {
  docId?: string; // Optional property to store the document ID
  roomId: string;
  roomName: string;
  creator: ProfileUser;
  members: ProfileUser[];
  voteType: string;
  connectionCode: string;
  timeLimit: number;
  startTime: Date;
  endTime: {
    seconds: number;
    nanoseconds: number;
  };
}
