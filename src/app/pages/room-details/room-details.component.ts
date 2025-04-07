import {
    Component,
    OnInit,
    OnDestroy,
    ChangeDetectorRef,
    ChangeDetectionStrategy, ViewChildren, QueryList, ElementRef,
} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {DatabaseService} from '../../../api/services/database-service/database.service';
import {Room} from '../../../api/models/room';
import {interval, Subscription} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {TranslateService} from '@ngx-translate/core';
import {Location} from '@angular/common';
import {SnackbarService} from "../../../api/services/snackbar-service/snackbar-service.service";
import {AuthService} from "../../../api/services/auth-service/auth.service";
import {DocumentReference, onSnapshot} from "@angular/fire/firestore";
import firebase from "firebase/compat";
import DocumentData = firebase.firestore.DocumentData;
import {ProfileUser} from "../../../api/models/user";
import {UsersService} from "../../../api/services/users-service/users.service";

@Component({
    selector: 'app-room-details',
    templateUrl: './room-details.component.html',
    styleUrls: ['./room-details.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomDetailsComponent implements OnInit, OnDestroy {
    @ViewChildren('optionInput') optionInputs!: QueryList<ElementRef<HTMLInputElement>>;

    protected room: Room | null = null;
    protected remainingTime = '';
    protected options: string[] = ['', ''];
    protected question = '';
    protected pollCreated = false;
    protected isLoading = true;
    private timerSubscription?: Subscription;
    protected initTimestamp = 0;
    protected showWaitingMessage = false;
    protected isCreator = false;
    protected isDarkMode = false;
    protected currentUser: ProfileUser | null = null;
    protected showFriendList: boolean = true;
    protected friends: ProfileUser[] = [];
    protected friendListLoaded = false;

    private unsubscribeSnapshot?: () => void;


    constructor(
        private cdr: ChangeDetectorRef,
        private route: ActivatedRoute,
        private dbService: DatabaseService,
        private snackbar: SnackbarService,
        private translate: TranslateService,
        private location: Location,
        private authService: AuthService,
        private userService: UsersService,
    ) {
    }

    ngOnInit(): void {

        this.loadFriends();
        this.loadCurrentUser();

        this.initTimestamp = performance.now();
        const roomCode = this.route.snapshot.paramMap.get('code');
        if (roomCode) this.loadRoomDetails(roomCode);


        this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            this.isDarkMode = e.matches;
            this.cdr.markForCheck();
        });
    }

    ngOnDestroy(): void {
        this.unsubscribeSnapshot?.();
        this.timerSubscription?.unsubscribe();
    }


    loadRoomDetails(roomCode: string): void {
        this.dbService.getRoomDocRefByCode(roomCode).subscribe({
            next: (roomRef: DocumentReference<DocumentData>) => {
                this.unsubscribeSnapshot?.();

                this.unsubscribeSnapshot = onSnapshot(roomRef, (snapshot) => {
                    const room = snapshot.data() as Room;

                    if (room && room.endTime) {
                        this.room = {...room, docId: roomRef.id};
                        this.pollCreated = !!room.pollCreated;

                        const endTime = new Date(room.endTime.seconds * 1000);
                        const now = Date.now();
                        const diff = endTime.getTime() - now;

                        if (diff <= 0) {
                            this.translate.get('room.expired').subscribe((translated) => {
                                this.remainingTime = translated;
                                this.cdr.markForCheck();
                            });
                        } else {
                            this.remainingTime = this.convertMsToTime(diff);
                            this.startTimer(endTime);
                        }

                        this.authService.getCurrentUser().subscribe(currentUser => {
                            this.isCreator = currentUser?.uid === room.creator?.uid;
                            const hasNoPollYet = !room.poll?.options || room.poll?.options.length === 0;
                            this.showWaitingMessage = !this.isCreator && hasNoPollYet && !room.pollCreated;
                            this.cdr.markForCheck();
                        });
                    }

                    this.isLoading = false;
                    this.cdr.markForCheck();
                });
            },
            error: () => {
                this.translate.get('room.errorLoadRoom').subscribe(msg =>
                    this.snackbar.error(msg)
                );
                this.isLoading = false;
                this.cdr.markForCheck();
            }
        });
    }

    startTimer(endTime: Date): void {
        this.timerSubscription = interval(1000)
            .pipe(
                map(() => {
                    const diff = endTime.getTime() - Date.now();
                    return diff <= 0 ? null : this.convertMsToTime(diff);
                })
            )
            .subscribe((timeStr) => {
                if (timeStr === null) {
                    this.translate.get('room.expired').subscribe((translated) => {
                        this.remainingTime = translated;
                        this.cdr.markForCheck();
                    });
                    this.timerSubscription?.unsubscribe();
                } else {
                    this.remainingTime = timeStr;
                    this.cdr.markForCheck();
                }
            });
    }

    convertMsToTime(ms: number): string {
        const sec = Math.floor((ms / 1000) % 60);
        const min = Math.floor((ms / (1000 * 60)) % 60);
        const hrs = Math.floor((ms / (1000 * 60 * 60)) % 24);
        return `${hrs} h, ${min} m, ${sec} s`;
    }


    addOption(): void {
        if (this.options.length < 10) {
            this.options.push('');

            this.cdr.detectChanges();
            setTimeout(() => {
                const lastInput = this.optionInputs.last;
                lastInput?.nativeElement.focus();
            });
        }
    }


    removeOption(index: number): void {
        if (this.options.length > 2) this.options.splice(index, 1);
    }

    trackByFn(index: number): number {
        return index;
    }

    createPoll(): void {
        if (!this.room?.docId) {
            this.translate.get('room.errorMissingRoom').subscribe(msg =>
                this.snackbar.error(msg)
            );
            return;
        }

        if (!this.question.trim()) {
            this.translate.get('room.errorMissingQuestion').subscribe(msg =>
                this.snackbar.error(msg)
            );
            return;
        }

        if (this.options.some((o) => !o.trim())) {
            this.translate.get('room.errorMissingOption').subscribe(msg =>
                this.snackbar.error(msg)
            );
            return;
        }

        const poll = {
            question: this.question.trim(),
            options: this.options.filter((o) => o.trim()),
        };

        this.dbService.addPollToRoom(this.room.docId, poll).subscribe({
            next: () => {
                this.translate.get('room.pollSuccess').subscribe(msg =>
                    this.snackbar.success(msg)
                );

                this.dbService.updateRoomPollState(this.room!.docId!, true).subscribe({
                    next: () => {
                        this.pollCreated = true;
                        this.cdr.markForCheck();
                    },
                    error: () => {
                        this.translate.get('room.errorUpdateRoom').subscribe(msg =>
                            this.snackbar.error(msg)
                        );
                    },
                });

            },
            error: () => {
                this.translate.get('room.errorPollCreation').subscribe(msg =>
                    this.snackbar.error(msg)
                );
            },
        });
    }

    goBack(): void {
        this.location.back();
    }

    private loadCurrentUser(): void {
        this.authService.getCurrentUser().pipe(take(1)).subscribe((user) => {
            if (user) {
                this.userService.getUserById(user.uid).pipe(take(1)).subscribe((profileUser) => {
                    this.currentUser = profileUser;
                    this.cdr.markForCheck();
                });
            }
        });
    }


    private loadFriends(): void {
        this.authService.getCurrentUser().pipe(take(1)).subscribe((user) => {
            if (user) {
                this.userService.getFriends(user.uid).pipe(take(1)).subscribe((friends) => {
                    this.friends = friends;
                    this.friendListLoaded = true;
                    this.cdr.markForCheck();
                });
            } else {
                this.friendListLoaded = true;
                this.cdr.markForCheck();
            }
        });
    }


    toggleFriendList(): void {
        this.showFriendList = !this.showFriendList;
    }
}
