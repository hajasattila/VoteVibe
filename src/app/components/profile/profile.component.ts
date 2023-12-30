import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { FormControl, FormGroup, NonNullableFormBuilder, Validators } from "@angular/forms";
import { HotToastService } from "@ngneat/hot-toast";
import { UntilDestroy, untilDestroyed } from "@ngneat/until-destroy";
import { filter, of, switchMap, take, tap } from "rxjs";
import { ProfileUser } from "src/app/models/user";
import { ImageUploadService } from "src/app/services/image-upload.service";
import { UsersService } from "src/app/services/users.service";
import { AuthService } from "src/app/services/auth.service";
import { Router } from "@angular/router";

@UntilDestroy()
@Component({
  selector: "app-profile",
  templateUrl: "./profile.component.html",
  styleUrls: ["./profile.component.css"],
})
export class ProfileComponent implements OnInit {
  user$ = this.usersService.currentUserProfile$;
  user?: ProfileUser; // Defining the user property
  showFriendRequests = false; // This will track whether the friend requests are shown

  profileForm = this.fb.group({
    uid: [""],
    displayName: [""],
    firstName: [""],
    lastName: [""],
    phone: ["", [Validators.required, Validators.pattern(/^06\d{9}$/)]],
    description: [""],
  });

  constructor(
    private imageUploadService: ImageUploadService,
    private toast: HotToastService,
    private usersService: UsersService,
    private authService: AuthService,
    private fb: NonNullableFormBuilder,
    private cdRef: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
  }

  uploadFile(event: any, { uid }: ProfileUser) {
    this.imageUploadService
      .uploadImage(event.target.files[0], `images/profile/${uid}`)
      .pipe(
        this.toast.observe({
          loading: "Uploading profile image...",
          success: "Image uploaded successfully",
          error: "There was an error in uploading the image",
        }),
        switchMap((photoURL) =>
          this.usersService.updateUser({
            uid,
            photoURL,
          })
        )
      )
      .subscribe();
  }

  saveProfile() {
    const { uid, ...data } = this.profileForm.value;
    let displayName = this.profileForm.get("displayName")?.value;

    if (!uid || typeof displayName !== "string") {
      this.toast.error("Please ensure all fields are filled out correctly.");
      return;
    }

    // Trim the displayName to remove any leading or trailing whitespace
    displayName = displayName.trim();
    if (!displayName) {
      this.toast.error("Display name cannot be empty.");
      return;
    }
    this.usersService
      .isDisplayNameTaken(displayName)
      .pipe(
        take(1),
        switchMap((isTaken) => {
          const currentDisplayNameLower = this.user?.displayName?.toLowerCase();
          let displayName = this.profileForm.get("displayName")?.value as string;
          const newDisplayNameLower = displayName.toLowerCase();

          // Allow the user to set their own previous display name
          if (isTaken && currentDisplayNameLower !== newDisplayNameLower) {
            this.toast.error("This Nickname name is already taken. Please choose another one.");
            return of(null); // Return null to stop the observable chain
          } else {
            // Update the user data if the displayName is unique or belongs to the current user
            return this.usersService.updateUser({ uid, displayName, ...data }).pipe(
              this.toast.observe({
                loading: "Saving profile data...",
                success: "Profile updated successfully",
                error: "There was an error in updating the profile",
              })
            );
          }
        }),
        filter((result) => !!result) // Filter out the null results to stop the subscription
      )
      .subscribe(() => {
        this.router.navigate(["/home"]);
      });
  }

  resetPassword() {
    const shouldReset = confirm("Are you sure you want to update your password?");

    if (shouldReset) {
      this.user$.subscribe((user) => {
        if (user && user.email) {
          const email = user.email;

          this.authService.resetPassword(email).subscribe(
            () => {
              console.log("Password reset email sent successfully");
            },
            (error) => {
              console.error("Error sending password reset email", error);
            }
          );
        } else {
          console.error("Email address is required");
        }
      });
    }
  }

  acceptFriendRequest(requestingUserId: string) {
    if (!this.user) {
      console.error("No user logged in!");
      this.toast.error("You need to be logged in to accept friend requests.");
      return;
    } else {
      const user = this.user; // Use a local variable for the user

      // Retrieve the display name of the user sending the friend request
      this.usersService.getUserById(requestingUserId).subscribe({
        next: (requestingUser) => {
          if (requestingUser) {
            this.usersService.acceptFriendRequest(user.uid, requestingUserId).subscribe({
              next: () => {
                console.log("Friend request accepted");

                // Update friendRequests safely
                user.friendRequests = (user.friendRequests ?? []).filter((id) => id !== requestingUserId);

                // Update the local friendList with the user's displayName
                if (!user.friendList) {
                  user.friendList = [];
                }
                user.friendList.push({ uid: requestingUserId, displayName: requestingUser.displayName });

                // Trigger change detection if necessary
                this.cdRef.detectChanges();

                // Show success toast message with the user's displayName
                this.toast.success(`Friend request from ${requestingUser.displayName} accepted successfully!`);

                this.router.navigateByUrl("/profile"); // Update this with the actual route
              },
              error: (error) => {
                console.error("Failed to accept friend request", error);
                this.toast.error("Failed to accept friend request");
              },
            });
          } else {
            this.toast.error("User not found");
          }
        },
        error: () => {
          this.toast.error("Failed to retrieve user details");
        },
      });
    }
  }

  rejectFriendRequest(requestingUserId: string) {
    const user = this.user;

    if (!user) {
      console.error("No user logged in!");
      this.toast.error("You need to be logged in to reject friend requests.");
      return;
    }

    // Retrieve the display name of the user sending the friend request
    this.usersService.getUserById(requestingUserId).subscribe({
      next: (requestingUser) => {
        if (requestingUser) {
          const displayName = requestingUser.displayName || "Unknown User";

          // Confirm before rejecting the friend request
          if (!confirm(`Are you sure you want to reject the friend request from ${displayName}?`)) {
            return;
          }

          // Update the current user's friendRequests field to remove the requesting user's ID
          this.usersService.rejectFriendRequest(user.uid, requestingUserId).subscribe({
            next: () => {
              console.log("Friend request rejected");

              // Update friendRequests safely
              if (user.friendRequests) {
                user.friendRequests = user.friendRequests.filter((id) => id !== requestingUserId);
              }

              // Trigger change detection if necessary
              this.cdRef.detectChanges();

              // Show success toast message with the user's displayName
              this.toast.info(`Friend request from ${displayName} rejected successfully!`);

              this.router.navigateByUrl("/profile"); // Update this with the actual route
            },
            error: (error) => {
              console.error("Failed to reject friend request", error);
              this.toast.error("Failed to reject friend request");
            },
          });
        } else {
          this.toast.error("User not found");
        }
      },
      error: () => {
        this.toast.error("Failed to retrieve user details");
      },
    });
  }

  toggleFriendRequests() {
    this.showFriendRequests = !this.showFriendRequests;
    const element = document.querySelector(".friend-requests-animation");
    if (element) {
      if (this.showFriendRequests) {
        element.classList.add("ng-animate-active");
      } else {
        element.classList.remove("ng-animate-active");
      }
    }
  }
}
