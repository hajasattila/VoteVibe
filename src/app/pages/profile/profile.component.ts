import {ChangeDetectorRef, Component, OnInit} from "@angular/core";
import {FormControl, FormGroup, NonNullableFormBuilder, Validators} from "@angular/forms";
import {HotToastService} from "@ngneat/hot-toast";
import {UntilDestroy, untilDestroyed} from "@ngneat/until-destroy";
import {filter, first, of, switchMap, take, tap} from "rxjs";
import {ProfileUser} from "src/api/models/user";
import {ImageUploadService} from "src/api/services/image-upload-service/image-upload.service";
import {UsersService} from "src/api/services/users-service/users.service";
import {AuthService} from "src/api/services/auth-service/auth.service";
import {Router} from "@angular/router";
import {SnackbarService} from "../../../api/services/snackbar-service/snackbar-service.service";
import {TranslateService} from "@ngx-translate/core";

@UntilDestroy()
@Component({
    selector: "app-profile",
    templateUrl: "./profile.component.html",
    styleUrls: ["./profile.component.css"],
})
export class ProfileComponent implements OnInit {
    user$ = this.usersService.currentUserProfile$;
    user?: ProfileUser;
    showFriendRequests = false;

    profileForm = this.fb.group({
        uid: [""],
        displayName: ["", [Validators.required, Validators.maxLength(12)]],
        firstName: ["", [Validators.required, Validators.maxLength(12)]],
        lastName: ["", [Validators.required, Validators.maxLength(12)]],
        phone: ["", [Validators.required, Validators.pattern(/^06\d{9}$/)]],
        description: ["", [Validators.maxLength(100)]],
    });


    constructor(
        private imageUploadService: ImageUploadService,
        private usersService: UsersService,
        private authService: AuthService,
        private fb: NonNullableFormBuilder,
        private cdRef: ChangeDetectorRef,
        private router: Router,
        private snackbar: SnackbarService,
        private translate: TranslateService
    ) {
    }

    ngOnInit(): void {
        this.initializeProfile();
    }

    private initializeProfile(): void {
        this.user$
            .pipe(
                first(),
                tap((user) => {
                    if (!user) {
                        this.router.navigate(["/register"]);
                        return;
                    }

                    this.user = user;
                    this.profileForm.patchValue({
                        uid: user.uid,
                        displayName: user.displayName,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        phone: user.phone,
                        description: user.description,
                    });

                    this.cdRef.detectChanges();
                }),
                untilDestroyed(this)
            )
            .subscribe({
                error: (err) => {
                    console.error("Error fetching user data:", err);
                    this.translate.get('profile.error.fetchUser').subscribe(msg => this.snackbar.error(msg));
                    this.cdRef.detectChanges();
                },
            });
    }


    uploadFile(event: any, {uid}: ProfileUser) {
        const file = event.target.files[0];
        if (!file) return;

        this.translate.get('profile.upload.loading').subscribe(loadingMsg => {
            this.snackbar.info(loadingMsg);

            this.imageUploadService
                .uploadImage(file, `images/profile/${uid}`)
                .pipe(
                    switchMap((photoURL) =>
                        this.usersService.updateUser({
                            uid,
                            photoURL,
                        })
                    )
                )
                .subscribe({
                    next: () => {
                        this.translate.get('profile.upload.success').subscribe(msg => this.snackbar.success(msg));
                    },
                    error: () => {
                        this.translate.get('profile.upload.error').subscribe(msg => this.snackbar.error(msg));
                    },
                });
        });
    }


    saveProfile() {
        const {uid, ...data} = this.profileForm.value;
        let displayName = this.profileForm.get("displayName")?.value?.trim();

        if (!uid || !displayName || this.profileForm.invalid) {
            this.translate.get('profile.error.invalidForm').subscribe(msg => this.snackbar.error(msg));
            return;
        }

        this.usersService.isDisplayNameTaken(displayName, uid).pipe(take(1)).subscribe((isTaken) => {
            if (isTaken) {
                this.translate.get('profile.error.nameTaken').subscribe(msg => this.snackbar.error(msg));
                return;
            }

            this.usersService.updateUser({uid, displayName, ...data}).subscribe({
                next: () => {
                    this.translate.get('profile.success.updated').subscribe(msg => this.snackbar.success(msg));
                    this.router.navigate(["/profile"]);
                },
                error: () => {
                    this.translate.get('profile.error.updateFailed').subscribe(msg => this.snackbar.error(msg));
                },
            });
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
            this.translate.get('profile.error.noUser').subscribe(msg => this.snackbar.error(msg));
            return;
        }

        this.usersService.getUserById(requestingUserId).subscribe({
            next: (requestingUser) => {
                if (!requestingUser) {
                    this.translate.get('profile.error.userNotFound').subscribe(msg => this.snackbar.error(msg));
                    return;
                }

                this.usersService.acceptFriendRequest(this.user!.uid, requestingUserId).subscribe({
                    next: () => {
                        this.translate.get('profile.success.friendAccepted', {name: requestingUser.displayName}).subscribe(msg => this.snackbar.success(msg));
                        this.router.navigateByUrl("/profile");
                    },
                    error: () => {
                        this.translate.get('profile.error.friendAcceptFailed').subscribe(msg => this.snackbar.error(msg));
                    }
                });
            },
            error: () => {
                this.translate.get('profile.error.userNotFound').subscribe(msg => this.snackbar.error(msg));
            }
        });
    }

    rejectFriendRequest(requestingUserId: string) {
        if (!this.user) {
            this.translate.get('profile.error.noUser').subscribe(msg => this.snackbar.error(msg));
            return;
        }

        this.usersService.getUserById(requestingUserId).pipe(take(1)).subscribe({
            next: (requestingUser) => {
                if (!requestingUser) {
                    this.translate.get('profile.error.userNotFound').subscribe(msg => this.snackbar.error(msg));
                    return;
                }

                this.usersService.rejectFriendRequest(this.user!.uid, requestingUserId).subscribe({
                    next: () => {
                        this.translate.get('profile.success.friendRejected', {name: requestingUser.displayName}).subscribe(msg => this.snackbar.info(msg));
                        this.router.navigateByUrl("/profile");
                    },
                    error: () => {
                        this.translate.get('profile.error.friendRejectFailed').subscribe(msg => this.snackbar.error(msg));
                    }
                });
            },
            error: () => {
                this.translate.get('profile.error.userNotFound').subscribe(msg => this.snackbar.error(msg));
            }
        });
    }


    logout() {
        this.authService.logout().subscribe(() => {
            this.router.navigate(['/']);
        });
    }
}
