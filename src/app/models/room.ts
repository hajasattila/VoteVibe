import { ProfileUser } from "./user";

export interface Room {
    roomId: string;
    roomName: string;
    creator: ProfileUser;
    members: ProfileUser[];
    voteType: string;
    connectionCode: string;
    timeLimit: number;
    startTime: Date;
    endTime: Date;
  }