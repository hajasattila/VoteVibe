import {
    Component,
    Input,
    OnInit,
    OnChanges,
    SimpleChanges
} from "@angular/core";
import {of} from "rxjs";
import {switchMap} from "rxjs/operators";
import {ProfileUser} from "../../../api/models/user";
import {UsersService} from "../../../api/services/users-service/users.service";
import {TranslateService} from "@ngx-translate/core";
import {SnackbarService} from "../../../api/services/snackbar-service/snackbar-service.service";
import {AuthService} from "../../../api/services/auth-service/auth.service";
import {Router} from "@angular/router";
import {Room} from "../../../api/models/room";

@Component({
    selector: "app-friend-list",
    templateUrl: "./friend-list.component.html",
    styleUrls: ["./friend-list.component.css"],
})
export class FriendListComponent implements OnInit, OnChanges {
    @Input() friends: ProfileUser[] = [];

    @Input() set room(value: Room | null) {
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
                        this.translate.get('friends.inviteSuccess', { name: uid }).subscribe(msg =>
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

    private _room: Room | null = null;

    invitedFriends: Set<string> = new Set();
    friendImages: { [uid: string]: string } = {};
    loadedImages: { [uid: string]: boolean } = {};
    currentUserId: string | null = null;
    currentUserDisplayName: string = '';
    showConfirmModal = false;
    selectedFriend: ProfileUser | null = null;
    deletionSuccess = false;
    routePath: string = '';

    constructor(
        private userService: UsersService,
        private snackbar: SnackbarService,
        private translate: TranslateService,
        private authService: AuthService,
        private router: Router,
    ) {}

    ngOnInit() {
        this.routePath = this.router.url;

        this.authService.getCurrentUser().subscribe(user => {
            this.currentUserId = user?.uid || null;
            this.currentUserDisplayName = user?.displayName || '';
        });

        this.loadFriendImages();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['friends']) {
            this.loadFriendImages();
        }
    }

    loadFriendImages(): void {
        if (!this.friends) return;

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
                };
                img.onerror = () => {
                    this.loadedImages[friend.uid] = false;
                    this.friendImages[friend.uid] = "/assets/images/image-placeholder.png";
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
                this.translate.get('friends.removeSuccess', { name: this.selectedFriend?.displayName }).subscribe(msg =>
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
                this.translate.get('friends.removeError', { name: this.selectedFriend?.displayName }).subscribe(msg =>
                    this.snackbar.error(msg)
                );
                this.showConfirmModal = false;
                this.selectedFriend = null;
            }
        });
    }

    confirmAction() {
        if (!this.selectedFriend) return;

        if (this.routePath.includes('/game')) {
            if (!this._room?.roomId) {
                console.warn(' megjelölve meghívandónak:', this.selectedFriend);
                this.invitedFriends.add(this.selectedFriend.uid);

                this.translate.get('friends.markedForInvite', { name: this.selectedFriend.displayName }).subscribe(msg =>
                    this.snackbar.info(msg)
                );

                this.deletionSuccess = true;
                setTimeout(() => {
                    this.showConfirmModal = false;
                    this.selectedFriend = null;
                }, 1500);
                return;
            }

            this.userService.inviteUserToRoom(
                this.selectedFriend.uid,
                this._room.roomId,
                this._room.creator,
                this._room.roomName
            ).subscribe({
                next: () => {
                    this.translate.get('friends.inviteSuccess', { name: this.selectedFriend!.displayName }).subscribe(msg =>
                        this.snackbar.success(msg)
                    );

                    this.invitedFriends.add(this.selectedFriend!.uid);
                    this.deletionSuccess = true;

                    setTimeout(() => {
                        this.showConfirmModal = false;
                        this.selectedFriend = null;
                    }, 1500);
                },
                error: (err) => {
                    console.error(`${err.message}`);
                    this.snackbar.error('Hiba történt a meghívás során.');
                    this.showConfirmModal = false;
                    this.selectedFriend = null;
                }
            });

        } else {
            this.confirmDelete();
        }
    }
}
