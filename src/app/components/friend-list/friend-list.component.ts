// friend-list.component.ts
import { Component, Input, OnInit } from "@angular/core";
import { Observable, of } from "rxjs";
import { switchMap } from "rxjs/operators";
import { ProfileUser } from "../../models/user";
import { UsersService } from "../../services/users.service";
import { HotToastService } from "@ngneat/hot-toast";

@Component({
  selector: "app-friend-list",
  templateUrl: "./friend-list.component.html",
  styleUrls: ["./friend-list.component.css"],
})
export class FriendListComponent implements OnInit {
  @Input() friends: { uid: string }[] | undefined = undefined;
  friendImages: { [uid: string]: Observable<string> } = {};

  constructor(
    private userService: UsersService,
    private toast: HotToastService // Ensure this is correctly typed and named
  ) {}

  ngOnInit() {
    if (this.friends) {
      for (let friend of this.friends) {
        this.friendImages[friend.uid] = this.userService.getUserById(friend.uid).pipe(
          switchMap((user: ProfileUser) => {
            return of(user.photoURL || "/assets/images/image-placeholder.png");
          })
        );
      }
    }
  }

  getFriendPhotoURL(uid: string): Observable<string> {
    return this.friendImages[uid] || of("/assets/images/image-placeholder.png");
  }

  getFriendDisplayName(friend: ProfileUser | undefined): string {
    if (friend && friend.displayName) {
      return friend.displayName; // Return the friend's displayName if it exists
    } else {
      return "Unknown"; // Return a default value if displayName is not available
    }
  }
  removeFriend(friend: ProfileUser) {
    if (confirm(`Are you sure you want to remove ${friend.displayName}?`)) {
      this.userService.removeFriend(friend).subscribe({  // Pass the whole 'friend' object
        next: () => {
          // Update the local friends list
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
