import { Component, HostListener, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";
import { Observable, of } from "rxjs";
import { switchMap, startWith, take } from "rxjs/operators";
import { UsersService } from "../../../api/services/users-service/users.service";
import { AuthService } from "../../../api/services/auth-service/auth.service";
import { ProfileUser } from "../../../api/models/user";
import { TranslateService } from "@ngx-translate/core";
import {SnackbarService} from "../../../api/services/snackbar-service/snackbar-service.service";

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
        private snackbar: SnackbarService,
        private translate: TranslateService
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
            } else {
                this.isAuthenticated = false;
                this.currentUserId = null;
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
            this.translate.get('search.errorNotLoggedIn').subscribe(msg =>
                this.snackbar.error(msg)
            );
            return;
        }

        if (user.uid === this.currentUserId) {
            this.translate.get('search.errorSelfFriend').subscribe(msg =>
                this.snackbar.error(msg)
            );
            return;
        }

        if (this.currentUser && this.currentUser.friendList) {
            const isAlreadyFriend = this.currentUser.friendList.some(friend => friend.uid === user.uid);
            if (isAlreadyFriend) {
                this.translate.get('search.errorAlreadyFriend').subscribe(msg =>
                    this.snackbar.info(msg)
                );
                return;
            }
        }

        this.userService.hasAlreadySentRequest(this.currentUserId!, user.uid)
            .pipe(take(1))
            .subscribe((hasSent) => {
                if (hasSent) {
                    this.translate.get('search.errorAlreadySent', { name: user.displayName }).subscribe(msg =>
                        this.snackbar.error(msg)
                    );
                } else {
                    this.translate.get('search.loadingSendingRequest').subscribe(loadingMsg =>
                        this.snackbar.info(loadingMsg)
                    );

                    this.userService.sendFriendRequest(this.currentUserId!, user.uid)
                        .pipe(take(1))
                        .subscribe({
                            next: () => {
                                this.translate.get('search.successRequestSent', { name: user.displayName }).subscribe(msg =>
                                    this.snackbar.success(msg)
                                );
                            },
                            error: () => {
                                this.translate.get('search.errorSendFailed', { name: user.displayName }).subscribe(msg =>
                                    this.snackbar.error(msg)
                                );
                            }
                        });
                }
            });
    }
}
