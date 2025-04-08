import {textPollModel} from "./textPoll.model";
import {ProfileUser} from "./user.model";

export interface RoomModel {
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
    poll?: textPollModel;
    pollCreated?: boolean;
    pollResults?: Record<string, Record<string, number>>;
    createdAt: Date;
}

export {textPollModel};

