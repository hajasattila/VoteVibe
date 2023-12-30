import { Component, HostListener, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";
import { Observable, of } from "rxjs";
import { switchMap, startWith } from "rxjs/operators";
import { UsersService } from "../services/users.service";
import { AuthService } from "../services/auth.service"; // Feltételezve, hogy van AuthService-ed
import { ProfileUser } from "../models/user";
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
  showSuggestions = false;  // New property to control the display of suggestions


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
        console.log("Bejelentkezett felhasználó:", user);
      } else {
        console.log("Nincs bejelentkezett felhasználó.");
      }
    });

    this.authService.getCurrentUserUID().subscribe((uid) => {
      this.currentUserId = uid;
    });
  }

  @HostListener('document:click', ['$event']) onDocumentClick(event: MouseEvent) {
    // Explicit type assertion for event.target
    const target = event.target as HTMLElement;  
  
    // Referencia a keresőmező konténerére
    const searchContainer = document.getElementById('searchContainer');
  
    // Ellenőrizzük, hogy a kattintás a keresőmező konténerén belül történt-e
    this.showSuggestions = searchContainer?.contains(target) ?? false;
  }
  
  
  

  onAddFriend(user: ProfileUser) {
    if (user.uid === this.currentUserId) {
      this.toast.error("You can't add yourself as a friend!");
      return;
    }

    // Check if the selected user is already in the current user's friendList
    if (this.currentUser && this.currentUser.friendList) {
      const isAlreadyFriend = this.currentUser.friendList.some((friend) => friend.uid === user.uid);
      if (isAlreadyFriend) {
        this.toast.info(`${user.displayName} is already your friend!`);
        return;
      }
    } else {
      // Check if a friend request has already been sent
      this.userService.hasAlreadySentRequest(this.currentUserId!, user.uid).subscribe((hasSent) => {
        if (hasSent) {
          this.toast.error(`You have already sent a friend request to ${user.displayName}`);
        } else {
          console.log("Adding friend:", user.displayName);
          // Continue with sending friend request and updating the UI accordingly...
          this.userService
            .sendFriendRequest(this.currentUserId!, user.uid)
            .pipe(
              this.toast.observe({
                loading: "Friend request is being sent...",
                success: `Friend request has been sent to ${user.displayName}`,
                error: "There was an error in sending the friend request",
              })
            )
            .subscribe();
        }
      });
    }
  }
}
