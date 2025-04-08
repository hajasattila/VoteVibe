export interface RoomInvite {
    roomId: string;
    inviterUid: string;
    inviterName?: string;
    roomName?: string;
    sentAt?: Date;
    status?: 'pending' | 'accepted' | 'rejected';
}
