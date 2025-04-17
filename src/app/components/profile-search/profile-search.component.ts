import {Component, ElementRef, HostListener, OnInit, ViewChild} from "@angular/core";
import {FormControl} from "@angular/forms";
import {Observable, of} from "rxjs";
import {switchMap, startWith, take, map} from "rxjs/operators";
import {UsersService} from "../../../api/services/users-service/users.service";
import {AuthService} from "../../../api/services/auth-service/auth.service";
import {ProfileUser} from "../../../api/models/user.model";
import {TranslateService} from "@ngx-translate/core";
import {SnackbarService} from "../../../api/services/snackbar-service/snackbar-service.service";
import {DatabaseService} from "../../../api/services/database-service/database.service";
import {Router} from "@angular/router";

@Component({
    selector: "app-profile-search",
    templateUrl: "./profile-search.component.html",
    styleUrls: ["./profile-search.component.css"],
})
export class ProfileSearchComponent implements OnInit {
    @ViewChild('searchContainer') searchContainer!: ElementRef;

    searchControl = new FormControl();
    filteredUsers$!: Observable<ProfileUser[]>;
    currentUser?: ProfileUser;
    currentUserId: string | null = null;
    showSuggestions = false;
    isAuthenticated: boolean = false;

    constructor(
        private userService: UsersService,
        private authService: AuthService,
        private snackbar: SnackbarService,
        private translate: TranslateService,
        private router: Router,
    ) {


    }

    ngOnInit() {
        this.authService.getCurrentUser().subscribe((user) => {
            if (user) {
                this.isAuthenticated = true;
                this.currentUserId = user.uid;

                this.userService.getUserById(user.uid).pipe(take(1)).subscribe(profile => {
                    this.currentUser = profile;
                });

                this.filteredUsers$ = this.searchControl.valueChanges.pipe(
                    startWith(""),
                    switchMap((text) =>
                        text
                            ? this.userService.getFilteredUsers(text).pipe(
                                map(users =>
                                    users.filter(
                                        user =>
                                            user.uid !== this.currentUserId
                                    )
                                )
                            )
                            : of([])
                    )
                );

            } else {
                this.isAuthenticated = false;
                this.currentUserId = null;
                this.filteredUsers$ = of([]);
            }
        });
    }



    @HostListener("document:click", ["$event"])
    onDocumentClick(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (this.searchContainer && !this.searchContainer.nativeElement.contains(target)) {
            this.showSuggestions = false;
        }
    }

    onFocusSearch() {
        this.showSuggestions = true;
    }

    onAddFriend(user: ProfileUser) {
        if (!user.uid) return;
        if (user.uid === this.currentUserId) return;

        this.router.navigate([`/profile/${user.uid}`]);
    }


    isAlreadyFriendOrRequested(uid: string): boolean {
        const alreadyRequested = !!this.currentUser?.sentFriendRequests?.includes(uid);
        return alreadyRequested;
    }
    onNavigateToProfile(user: ProfileUser) {
        if (!user.uid || user.uid === this.currentUserId) return;
        this.router.navigate([`/profile/${user.uid}`]);
    }
    sendFriendRequest(user: ProfileUser, event: Event) {
        event.stopPropagation(); // Ne triggerelje a navigációt is

        if (!user.uid || user.uid === this.currentUserId || this.isAlreadyFriendOrRequested(user.uid)) return;

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
                    this.currentUser?.sentFriendRequests?.push(user.uid); // opcionális frissítés
                },
                error: () => {
                    this.translate.get('search.errorSendFailed', { name: user.displayName }).subscribe(msg =>
                        this.snackbar.error(msg)
                    );
                }
            });
    }



}
