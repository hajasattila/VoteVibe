import { Component, Input } from '@angular/core';
import { ProfileUser } from '../../models/user';

@Component({
  selector: 'app-friend-list',
  templateUrl: './friend-list.component.html',
  styleUrls: ['./friend-list.component.css'],
})
export class FriendListComponent {
  @Input() friends: ProfileUser[] | undefined = undefined;



  getFriendPhotoURL(friend: ProfileUser | undefined): string {
    if (friend && friend.displayName) {
      const photoURL = friend.photoURL;
      if (photoURL) {
        return photoURL;
      } else {
        return '/assets/images/default-avatar.png'; // Alapértelmezett kép, ha nincs profilkép
      }
    }
    return '';
  }
}
