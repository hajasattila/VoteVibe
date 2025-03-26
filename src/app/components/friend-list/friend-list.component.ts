import { Component, Input, OnInit } from "@angular/core";
import { Observable, of } from "rxjs";
import { switchMap } from "rxjs/operators";
import { ProfileUser } from "../../../api/models/user";
import { UsersService } from "../../../api/services/users-service/users.service";
import { HotToastService } from "@ngneat/hot-toast";

@Component({
  selector: "app-friend-list",
  templateUrl: "./friend-list.component.html",
  styleUrls: ["./friend-list.component.css"],
})
export class FriendListComponent implements OnInit {
  @Input() friends: { uid: string }[] | undefined = undefined;
  friendImages: { [uid: string]: string } = {};
  loadedImages: { [uid: string]: boolean } = {};

  constructor(
    private userService: UsersService,
    private toast: HotToastService
  ) {}

  ngOnInit() {
    if (this.friends) {
      for (let friend of this.friends) {
        this.userService.getUserById(friend.uid).pipe(
            switchMap((user: ProfileUser) => {
              const photoURL = user.photoURL || "/assets/images/image-placeholder.png";
              this.friendImages[friend.uid] = photoURL;
              return of(photoURL);
            })
        ).subscribe((photoURL) => {
          // Create an Image object to test loading
          const img = new Image();
          img.onload = () => {
            this.loadedImages[friend.uid] = true;
          };
          img.onerror = () => {
            this.loadedImages[friend.uid] = false;
            this.friendImages[friend.uid] = "/assets/images/image-placeholder.png";
          };
          img.src = photoURL;
        });
      }
    }
  }

  getFriendPhotoURL(uid: string): string {
    if (this.loadedImages[uid]) {
      return this.friendImages[uid];
    }
    return "/assets/images/image-placeholder.png";
  }

  getFriendDisplayName(friend: ProfileUser | undefined): string {
    if (friend && friend.displayName) {
      return friend.displayName;
    } else {
      return "Unknown";
    }
  }
  removeFriend(friend: ProfileUser) {
    if (confirm(`Are you sure you want to remove ${friend.displayName}?`)) {
      this.userService.removeFriend(friend).subscribe({
        next: () => {
          this.friends = this.friends ? this.friends.filter(f => f.uid !== friend.uid) : [];
          this.toast.success(`${friend.displayName} has been removed successfully.`);
        },
        error: (error) => {
          console.error("Error removing friend:", error);
          this.toast.error(`Failed to remove ${friend.displayName}.`);
        },
      });
    }
  }
}
