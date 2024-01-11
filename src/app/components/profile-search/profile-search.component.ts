import { Component, HostListener, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";
import { Observable, of } from "rxjs";
import { switchMap, startWith, take } from "rxjs/operators";
import { UsersService } from "../../services/users.service";
import { AuthService } from "../../services/auth.service"; // Feltételezve, hogy van AuthService-ed
import { ProfileUser } from "../../models/user";
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
  showSuggestions = false; // New property to control the display of suggestions
  isAuthenticated: boolean = false; // Track if the user is authenticated

  constructor(
    private userService: UsersService,
    private authService: AuthService, // Ensure AuthService is injected
    private toast: HotToastService // Ensure HotToastService is injected
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
        this.currentUserId = user.uid; // Ensure 'user.uid' exists and is not null
        console.log("Authenticated user ID:", this.currentUserId); // Check the user ID
      } else {
        this.isAuthenticated = false;
        this.currentUserId = null;
        console.log("User is not authenticated");
      }
    });
  }

  @HostListener("document:click", ["$event"]) onDocumentClick(event: MouseEvent) {
    // Explicit type assertion for event.target
    const target = event.target as HTMLElement;

    // Referencia a keresőmező konténerére
    const searchContainer = document.getElementById("searchContainer");

    // Ellenőrizzük, hogy a kattintás a keresőmező konténerén belül történt-e
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

    // Check if the selected user is already in the current user's friendList
    if (this.currentUser && this.currentUser.friendList) {
      const isAlreadyFriend = this.currentUser.friendList.some((friend) => friend.uid === user.uid);
      if (isAlreadyFriend) {
        console.log(`${user.displayName} is already your friend!`);
        return;
      }
    } else {
      // Check if a friend request has already been sent
      // Use take(1) to ensure the subscription is only triggered once
      this.userService
        .hasAlreadySentRequest(this.currentUserId!, user.uid)
        .pipe(take(1))
        .subscribe((hasSent) => {
          if (hasSent) {
            this.toast.error(`You have already sent a friend request to ${user.displayName}`);
          } else {
            console.log("Adding friend:", user.displayName);
            // Continue with sending friend request and updating the UI accordingly...
            // Use take(1) here as well to ensure the subscription is only triggered once
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
