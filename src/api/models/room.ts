import { textPoll } from "./textPoll";
import { ProfileUser } from "./user";

export interface Room {
  docId?: string;
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
  pollCreated?: boolean;

}
export { textPoll };

