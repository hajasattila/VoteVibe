import {
    Component,
    OnInit,
    OnDestroy,
    ChangeDetectorRef,
    ChangeDetectionStrategy,
} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {DatabaseService} from '../../../api/services/database-service/database.service';
import {Room} from '../../../api/models/room';
import {interval, Subscription} from 'rxjs';
import {map} from 'rxjs/operators';
import {TranslateService} from '@ngx-translate/core';
import {Location} from '@angular/common';
import {SnackbarService} from "../../../api/services/snackbar-service/snackbar-service.service";

@Component({
    selector: 'app-room-details',
    templateUrl: './room-details.component.html',
    styleUrls: ['./room-details.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomDetailsComponent implements OnInit, OnDestroy {
    room: Room | null = null;
    remainingTime = '';
    options: string[] = ['', ''];
    question = '';
    pollCreated = false;
    isLoading = true;

    private timerSubscription?: Subscription;
    protected initTimestamp = 0;

    constructor(
        private cdr: ChangeDetectorRef,
        private route: ActivatedRoute,
        private dbService: DatabaseService,
        private snackbar: SnackbarService,
        private translate: TranslateService,
        private location: Location
    ) {
    }

    ngOnInit(): void {
        this.initTimestamp = performance.now();
        const roomCode = this.route.snapshot.paramMap.get('code');
        if (roomCode) this.loadRoomDetails(roomCode);
    }

    loadRoomDetails(roomCode: string): void {
        this.dbService.getRoomByCode(roomCode).subscribe({
            next: (room) => {
                if (room && room.endTime) {
                    this.room = room;
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
                } else {
                    this.remainingTime = 'Room data is not available';
                }

                this.isLoading = false;
                this.cdr.markForCheck();
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

    ngOnDestroy(): void {
        this.timerSubscription?.unsubscribe();
    }

    addOption(): void {
        this.options.push('');
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

                if (this.room?.docId) {
                    this.dbService.updateRoomPollState(this.room.docId, true).subscribe({
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
                }
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
}
