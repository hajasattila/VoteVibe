import {
    Component,
    Input,
    OnInit,
    OnChanges,
    SimpleChanges, ChangeDetectorRef, OnDestroy
} from "@angular/core";
import {of} from "rxjs";
import {switchMap} from "rxjs/operators";
import {ProfileUser} from "../../../api/models/user.model";
import {UsersService} from "../../../api/services/users-service/users.service";
import {TranslateService} from "@ngx-translate/core";
import {SnackbarService} from "../../../api/services/snackbar-service/snackbar-service.service";
import {AuthService} from "../../../api/services/auth-service/auth.service";
import {Router} from "@angular/router";
import {RoomModel} from "../../../api/models/room.model";

@Component({
    selector: "app-friend-list",
    templateUrl: "./friend-list.component.html",
    styleUrls: ["./friend-list.component.css"],
})
export class FriendListComponent implements OnInit, OnChanges, OnDestroy {
    @Input() friends: ProfileUser[] = [];
    wasInvited: boolean = false;
    isLoadingFriends = true;

    @Input() set room(value: RoomModel | null) {
        this._room = value;

        if (value?.roomId && this.invitedFriends.size > 0) {
            this.invitedFriends.forEach(uid => {
                this.userService.inviteUserToRoom(
                    uid,
                    value.roomId,
                    value.creator,
                    value.roomName
                ).subscribe({
                    next: () => {
                        this.translate.get('friends.inviteSuccess', {name: uid}).subscribe(msg =>
                            this.snackbar.success(msg)
                        );
                    },
                    error: err => {
                        console.error(err);
                        this.snackbar.error('Hiba a meghívás elküldése közben.');
                    }
                });
            });

            this.invitedFriends.clear();
        }
    }

    private _room: RoomModel | null = null;

    invitedFriends: Set<string> = new Set();
    friendImages: { [uid: string]: string } = {};
    loadedImages: { [uid: string]: boolean } = {};
    currentUserId: string | null = null;
    currentUserDisplayName: string = '';
    showConfirmModal = false;
    selectedFriend: ProfileUser | null = null;
    deletionSuccess = false;
    routePath: string = '';
    private friendsSub: any;


    constructor(
        private userService: UsersService,
        private snackbar: SnackbarService,
        private translate: TranslateService,
        private authService: AuthService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {
    }

    ngOnInit() {
        this.routePath = this.router.url;

        this.authService.getCurrentUser().subscribe(user => {
            this.currentUserId = user?.uid || null;
            this.currentUserDisplayName = user?.displayName || '';

            if (this.currentUserId) {
                this.friendsSub = this.userService.getFriendsLive(this.currentUserId).subscribe(friends => {
                    this.friends = friends;
                    this.loadFriendImages(); // minden frissülés után újratöltjük a képeket is
                    this.cdr.markForCheck();
                });
            }
        });
    }

    ngOnDestroy(): void {
        if (this.friendsSub) {
            this.friendsSub.unsubscribe();
        }
    }


    ngOnChanges(changes: SimpleChanges): void {
        if (changes['friends']) {
            this.loadFriendImages();
        }
    }

    loadFriendImages(): void {
        if (!this.friends || this.friends.length === 0) {
            this.isLoadingFriends = false;
            return;
        }

        let loadedCount = 0;

        for (let friend of this.friends) {
            this.userService.getUserById(friend.uid).pipe(
                switchMap((user: ProfileUser) => {
                    const photoURL = user.photoURL || "/assets/images/image-placeholder.png";
                    this.friendImages[friend.uid] = photoURL;
                    return of(photoURL);
                })
            ).subscribe((photoURL) => {
                const img = new Image();
                img.onload = () => {
                    this.loadedImages[friend.uid] = true;
                    loadedCount++;
                    if (loadedCount === this.friends.length) {
                        this.isLoadingFriends = false;
                    }
                };
                img.onerror = () => {
                    this.loadedImages[friend.uid] = false;
                    this.friendImages[friend.uid] = "/assets/images/image-placeholder.png";
                    loadedCount++;
                    if (loadedCount === this.friends.length) {
                        this.isLoadingFriends = false;
                    }
                };
                img.src = photoURL;
            });
        }
    }

    getFriendPhotoURL(uid: string): string {
        return this.loadedImages[uid] ? this.friendImages[uid] : "/assets/images/image-placeholder.png";
    }

    getFriendDisplayName(friend: ProfileUser | undefined): string {
        return friend?.displayName || "Unknown";
    }

    openConfirmModal(friend: ProfileUser) {
        this.selectedFriend = friend;
        this.showConfirmModal = true;
        this.deletionSuccess = false;
    }

    cancelDelete() {
        this.selectedFriend = null;
        this.showConfirmModal = false;
    }

    confirmDelete() {
        if (!this.selectedFriend) return;

        this.userService.removeFriend(this.selectedFriend).subscribe({
            next: () => {
                this.friends = this.friends.filter(f => f.uid !== this.selectedFriend?.uid);
                this.translate.get('friends.removeSuccess', {name: this.selectedFriend?.displayName}).subscribe(msg =>
                    this.snackbar.success(msg)
                );
                this.deletionSuccess = true;

                setTimeout(() => {
                    this.showConfirmModal = false;
                    this.selectedFriend = null;
                }, 1500);
            },
            error: (error) => {
                console.error("Error removing friend:", error);
                this.translate.get('friends.removeError', {name: this.selectedFriend?.displayName}).subscribe(msg =>
                    this.snackbar.error(msg)
                );
                this.showConfirmModal = false;
                this.selectedFriend = null;
            }
        });
    }

    confirmAction() {
        if (!this.selectedFriend) return;
        const uid = this.selectedFriend.uid;

        if (this.isProfileRoute) {
            this.confirmDelete();
        } else {
            if (!this._room?.roomId) {

                if (this.invitedFriends.has(uid)) {
                    this.invitedFriends.delete(uid);
                    this.wasInvited = false;
                    this.translate.get('friends.unmarkedForInvite', {name: this.selectedFriend.displayName}).subscribe(msg =>
                        this.snackbar.info(msg)
                    );
                } else {
                    this.invitedFriends.add(uid);
                    this.wasInvited = true;
                    this.translate.get('friends.markedForInvite', {name: this.selectedFriend.displayName}).subscribe(msg =>
                        this.snackbar.info(msg)
                    );
                }
                this.deletionSuccess = true;
            } else {

                this.userService.inviteUserToRoom(
                    uid,
                    this._room.roomId,
                    this._room.creator,
                    this._room.roomName
                ).subscribe({
                    next: () => {
                        this.translate.get('friends.inviteSuccess', {name: this.selectedFriend!.displayName}).subscribe(msg =>
                            this.snackbar.success(msg)
                        );
                        this.invitedFriends.add(uid);
                        this.wasInvited = true;
                        this.deletionSuccess = true;
                    },
                    error: (err) => {
                        console.error(`${err.message}`);
                        this.snackbar.error('Hiba történt a meghívás során.');
                    }
                });
            }

            setTimeout(() => {
                this.showConfirmModal = false;
                this.selectedFriend = null;
            }, 1500);
        }
    }

    get isProfileRoute(): boolean {
        return this.routePath.includes('/profile');
    }

}
