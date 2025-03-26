export interface RoomInvitation {
    invitationId: string;
    roomId: string;
    senderId: string;
    sentDate: Date;
    status: 'pending' | 'accepted' | 'rejected';
  }