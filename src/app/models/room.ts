import { ProfileUser } from "./user";

export interface Creator {
  description: string;
  displayName: string;
}

export interface Room {
  docId?: string; // opcionális csak, az adatbázis ID miatt.
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
