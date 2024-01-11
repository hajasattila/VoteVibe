import { textPoll } from "./textPoll";
import { ProfileUser } from "./user";

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
  isAnonymous: boolean;
  poll?: textPoll;
  pollCreated?: boolean; // Add this line in your Room interface

}
export { textPoll };

