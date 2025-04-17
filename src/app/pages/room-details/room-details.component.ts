import {
    Component,
    OnInit,
    OnDestroy,
    ChangeDetectorRef,
    ChangeDetectionStrategy, ViewChildren, QueryList, ElementRef,
} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {DatabaseService} from '../../../api/services/database-service/database.service';
import {RoomModel} from '../../../api/models/room.model';
import {interval, Subscription} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {TranslateService} from '@ngx-translate/core';
import {Location} from '@angular/common';
import {SnackbarService} from "../../../api/services/snackbar-service/snackbar-service.service";
import {AuthService} from "../../../api/services/auth-service/auth.service";
import {DocumentReference, onSnapshot} from "@angular/fire/firestore";
import firebase from "firebase/compat";
import DocumentData = firebase.firestore.DocumentData;
import {ProfileUser} from "../../../api/models/user.model";
import {UsersService} from "../../../api/services/users-service/users.service";
import {ImageCompressorService} from "../../../api/services/image-compress-service/imagecompress.service";

@Component({
    selector: 'app-room-details',
    templateUrl: './room-details.component.html',
    styleUrls: ['./room-details.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomDetailsComponent implements OnInit, OnDestroy {
    @ViewChildren('optionInput') optionInputs!: QueryList<ElementRef<HTMLInputElement>>;

    protected room: RoomModel | null = null;
    protected remainingTime = '';
    protected options: string[] = [];
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

    protected imageFiles: (File | null)[] = [];
    protected imagePreviews: (string | null)[] = [];

    protected bulkUploadMode: boolean = false;

    protected isMobile = false;


    constructor(
        private cdr: ChangeDetectorRef,
        private route: ActivatedRoute,
        private dbService: DatabaseService,
        private snackbar: SnackbarService,
        private translate: TranslateService,
        private location: Location,
        private authService: AuthService,
        private userService: UsersService,
        private router: Router,
        private imageCompressor: ImageCompressorService
    ) {
    }

    ngOnInit(): void {
        this.detectPlatform();

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
        this.initializeOptions();
    }

    ngOnDestroy(): void {
        this.unsubscribeSnapshot?.();
        this.timerSubscription?.unsubscribe();
    }

    initializeOptions(): void {
        if (this.room?.voteType === 'picture' && !this.bulkUploadMode) {
            this.options = ['', ''];
            this.imageFiles = [null as any, null as any];
            this.imagePreviews = [null, null];
        }
    }

    onBulkToggle(): void {
        if (this.bulkUploadMode) {
            this.options = [];
            this.imageFiles = [];
            this.imagePreviews = [];
        } else {
            this.options = ['', ''];
            this.imageFiles = [null as any, null as any];
            this.imagePreviews = [null, null];
        }
        this.cdr.markForCheck();
    }

    loadRoomDetails(roomCode: string): void {
        this.dbService.getRoomDocRefByCode(roomCode).subscribe({
            next: (roomRef: DocumentReference<DocumentData>) => {
                this.unsubscribeSnapshot?.();
                this.unsubscribeSnapshot = onSnapshot(roomRef, (snapshot) => {
                    const room = snapshot.data() as RoomModel;
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
            .pipe(map(() => {
                const diff = endTime.getTime() - Date.now();
                return diff <= 0 ? null : this.convertMsToTime(diff);
            }))
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
        if (this.room?.voteType === 'picture') {
            this.imageFiles.push(null as any);
            this.imagePreviews.push(null);
            this.options.push('');
        } else {
            this.options.push('');
            this.cdr.detectChanges();
            setTimeout(() => {
                const lastInput = this.optionInputs.last;
                lastInput?.nativeElement.focus();
            });
        }
    }

    removeOption(index: number): void {
        if (this.options.length > 2) {
            this.options.splice(index, 1);
            this.imageFiles.splice(index, 1);
            this.imagePreviews.splice(index, 1);
        } else {
            this.imageFiles[index] = null;
            this.imagePreviews[index] = null;
        }
        this.cdr.markForCheck();
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
        this.router.navigate(['/home']);
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

    goToStats(): void {
        const code = this.route.snapshot.paramMap.get('code');
        if (code) this.router.navigate(['/room', code, 'stats']);
    }

    previewImage(file: File, index: number): void {
        const reader = new FileReader();
        reader.onload = () => {
            this.imagePreviews[index] = reader.result as string;
            this.cdr.markForCheck();
        };
        reader.readAsDataURL(file);
    }

    onImageSelected(event: Event, index: number): void {
        const input = event.target as HTMLInputElement;
        const file = input?.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            this.translate.get('room.errorOnlyImages').subscribe(msg => {
                this.snackbar.error(msg);
            });
            return;
        }
        this.imageCompressor.compressImage(file).then(compressedFile => {
            this.imageFiles[index] = compressedFile;
            this.previewImage(compressedFile, index);
        }).catch(() => {
            this.translate.get('room.errorImageCompression').subscribe(msg => {
                this.snackbar.error(msg);
            });
        });
    }

    uploadImagesAndCreatePoll(): void {
        if (!this.room?.docId) return;

        const validImages = this.imageFiles.filter(file => !!file);
        if (validImages.length < 2) {
            this.translate.get('room.errorMinimumTwoImages').subscribe(msg => {
                this.snackbar.error(msg);
            });
            return;
        }

        const uploadTasks = validImages.map((file, i) =>
            this.dbService.uploadPollImage(this.room!.roomId, file as File, `option_${i + 1}.jpg`)
        );

        Promise.all(uploadTasks).then(downloadUrls => {
            const poll = {
                question: this.question.trim() || 'Image poll',
                options: downloadUrls
            };

            this.dbService.addPollToRoom(this.room!.docId!, poll).subscribe(() => {
                this.dbService.updateRoomPollState(this.room!.docId!, true).subscribe(() => {
                    this.pollCreated = true;
                    this.cdr.markForCheck();
                    this.snackbar.success('Poll created with images');
                });
            });
        }).catch(() => {
            this.snackbar.error('Image upload failed');
        });
    }

    get isImagePollValid(): boolean {
        const validImages = this.imageFiles.filter(file => !!file);
        return validImages.length >= 2;
    }
    get isTextPollValid(): boolean {
        const validOptions = this.options.filter(option => option.trim().length > 0);
        return validOptions.length >= 2 && !!this.question.trim();
    }


    onDragOver(event: DragEvent): void {
        event.preventDefault();
    }

    onFileDrop(event: DragEvent, index: number): void {
        event.preventDefault();
        const file = event.dataTransfer?.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            this.translate.get('room.errorOnlyImages').subscribe(msg => {
                this.snackbar.error(msg);
            });
            return;
        }
        this.imageCompressor.compressImage(file).then(compressedFile => {
            this.imageFiles[index] = compressedFile;
            this.previewImage(compressedFile, index);
            this.cdr.markForCheck();
        }).catch(() => {
            this.translate.get('room.errorImageCompression').subscribe(msg => {
                this.snackbar.error(msg);
            });
        });
    }

    removeImage(index: number): void {
        if (this.imageFiles.length > 2) {
            this.imageFiles.splice(index, 1);
            this.imagePreviews.splice(index, 1);
            this.options.splice(index, 1);
        } else {
            this.imageFiles[index] = null;
            this.imagePreviews[index] = null;
        }
        this.cdr.markForCheck();
    }

    onBulkImagesSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const files = Array.from(input?.files || []);
        if (!files.length) return;

        const validImages = files.filter(file => file.type.startsWith('image/'));

        const maxAllowed = 10;
        const availableSlots = maxAllowed - this.imageFiles.length;

        if (availableSlots <= 0) {
            this.translate.get('room.errorMaxImages').subscribe(msg => {
                this.snackbar.error(msg);
            });
            return;
        }

        if (validImages.length > availableSlots) {
            this.translate.get('room.errorMaxImages').subscribe(msg => {
                this.snackbar.error(`${msg} (max: ${maxAllowed})`);
            });
        }

        const selectedToAdd = validImages.slice(0, availableSlots);

        const compressTasks = selectedToAdd.map(file =>
            this.imageCompressor.compressImage(file).then(compressed => {
                return compressed;
            })
        );

        Promise.all(compressTasks).then(compressedImages => {
            compressedImages.forEach((file) => {
                this.imageFiles.push(file);
                this.imagePreviews.push('');
                this.options.push('');
                const index = this.imageFiles.length - 1;
                this.previewImage(file, index);
            });
            this.cdr.markForCheck();
        }).catch(() => {
            this.translate.get('room.errorImageCompression').subscribe(msg => {
                this.snackbar.error(msg);
            });
        });
    }

    private detectPlatform(): void {
        const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
        this.isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase());
    }

}
