import { Component, HostListener, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";
import { Observable, of } from "rxjs";
import { switchMap, startWith, take } from "rxjs/operators";
import { UsersService } from "../../../api/services/users-service/users.service";
import { AuthService } from "../../../api/services/auth-service/auth.service";
import { ProfileUser } from "../../../api/models/user";
import { HotToastService } from "@ngneat/hot-toast";

@Component({
  selector: "app-profile-search",
  templateUrl: "./profile-search.component.html",
  styleUrls: ["./profile-search.component.css"],
})
export class ProfileSearchComponent implements OnInit {
  searchControl = new FormControl();
  filteredUsers$: Observable<ProfileUser[]>;
  currentUser?: ProfileUser;
  currentUserId: string | null = null;
  showSuggestions = false;
  isAuthenticated: boolean = false;

  constructor(
    private userService: UsersService,
    private authService: AuthService,
    private toast: HotToastService
  ) {
    this.filteredUsers$ = this.searchControl.valueChanges.pipe(
      startWith(""),
      switchMap((text) => (text ? this.userService.getFilteredUsers(text) : of([])))
    );
  }

  ngOnInit() {
    this.authService.getCurrentUser().subscribe((user) => {
      if (user) {
        this.isAuthenticated = true;
        this.currentUserId = user.uid;
        console.log("Authenticated user ID:", this.currentUserId);
      } else {
        this.isAuthenticated = false;
        this.currentUserId = null;
        console.log("User is not authenticated");
      }
    });
  }

  @HostListener("document:click", ["$event"]) onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    const searchContainer = document.getElementById("searchContainer");

    this.showSuggestions = searchContainer?.contains(target) ?? false;
  }

  onAddFriend(user: ProfileUser) {
    if (!user.uid) {
      this.toast.error("You need to login to add friend");
      return;
    }

    if (user.uid === this.currentUserId) {
      this.toast.error("You can't add yourself as a friend!");
      return;
    }

    if (this.currentUser && this.currentUser.friendList) {
      const isAlreadyFriend = this.currentUser.friendList.some((friend) => friend.uid === user.uid);
      if (isAlreadyFriend) {
        console.log(`${user.displayName} is already your friend!`);
        return;
      }
    } else {
      this.userService
        .hasAlreadySentRequest(this.currentUserId!, user.uid)
        .pipe(take(1))
        .subscribe((hasSent) => {
          if (hasSent) {
            this.toast.error(`You have already sent a friend request to ${user.displayName}`);
          } else {
            console.log("Adding friend:", user.displayName);
            this.userService
              .sendFriendRequest(this.currentUserId!, user.uid)
              .pipe(
                take(1),
                this.toast.observe({
                  loading: "Friend request is being sent...",
                  success: `Friend request has been sent to ${user.displayName}`,
                  error: `${user.displayName} is already your friend or deleted from your friendlist!`,
                })
              )
              .subscribe();
          }
        });
    }
  }
}
