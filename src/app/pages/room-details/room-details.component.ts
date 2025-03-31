import {
    Component,
    OnInit,
    OnDestroy,
    ChangeDetectorRef,
    ChangeDetectionStrategy,
} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {DatabaseService} from "../../../api/services/database-service/database.service";
import {Room} from "../../../api/models/room";
import {interval, Subscription} from "rxjs";
import {map} from "rxjs/operators";
import {HotToastService} from "@ngneat/hot-toast";

@Component({
    selector: "app-room-details",
    templateUrl: "./room-details.component.html",
    styleUrls: ["./room-details.component.css"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomDetailsComponent implements OnInit, OnDestroy {
    room: Room | null = null;
    remainingTime = "";
    options: string[] = ["", ""];
    question = "";
    pollCreated = false;
    isLoading = true;

    private timerSubscription?: Subscription;

    constructor(
        private cdr: ChangeDetectorRef,
        private route: ActivatedRoute,
        private dbService: DatabaseService,
        private toast: HotToastService
    ) {
    }

    ngOnInit(): void {
        const roomCode = this.route.snapshot.paramMap.get("code");
        if (roomCode) this.loadRoomDetails(roomCode);
    }

    loadRoomDetails(roomCode: string): void {
        this.dbService.getRoomByCode(roomCode).subscribe({
            next: (room) => {
                if (room && room.endTime) {
                    this.room = room;
                    this.pollCreated = !!room.pollCreated;

                    const endTime = new Date(room.endTime.seconds * 1000);
                    if (!isNaN(endTime.getTime())) {
                        this.startTimer(endTime);
                    } else {
                        console.error("Invalid endTime format:", room.endTime);
                        this.remainingTime = "Invalid time format";
                    }

                    this.isLoading = false; // 🔄 Kész a betöltés
                    this.cdr.markForCheck();
                } else {
                    console.error("Room is null or missing endTime.");
                    this.remainingTime = "Room data is not available";
                    this.isLoading = false;
                    this.cdr.markForCheck();
                }
            },
            error: () => {
                this.toast.error("Failed to load room data");
                this.isLoading = false;
                this.cdr.markForCheck();
            },
        });
    }

    startTimer(endTime: Date): void {
        this.timerSubscription = interval(1000)
            .pipe(
                map(() => {
                    const now = new Date().getTime();
                    const diff = endTime.getTime() - now;
                    return this.convertMsToTime(diff);
                })
            )
            .subscribe((time) => {
                this.remainingTime = time;
                this.cdr.markForCheck(); // OnPush frissítés
            });
    }

    convertMsToTime(ms: number): string {
        if (ms < 0) return "Expired";

        const sec = Math.floor((ms / 1000) % 60);
        const min = Math.floor((ms / (1000 * 60)) % 60);
        const hrs = Math.floor((ms / (1000 * 60 * 60)) % 24);

        return `${hrs} h, ${min} m, ${sec} s`;
    }

    ngOnDestroy(): void {
        this.timerSubscription?.unsubscribe();
    }

    addOption(): void {
        this.options.push("");
    }

    removeOption(index: number): void {
        if (this.options.length > 2) this.options.splice(index, 1);
    }

    trackByFn(index: number): number {
        return index;
    }

    createPoll(): void {
        if (!this.room?.docId) {
            this.toast.error("Room details are missing");
            return;
        }

        if (!this.question.trim()) {
            this.toast.error("The question is missing");
            return;
        }

        if (this.options.some((o) => !o.trim())) {
            this.toast.error("One or more options are missing");
            return;
        }

        const poll = {
            question: this.question.trim(),
            options: this.options.filter((o) => o.trim()),
        };

        this.dbService.addPollToRoom(this.room.docId, poll).subscribe({
            next: () => {
                this.toast.success("Poll added successfully");
                this.dbService.updateRoomPollState(this.room!.docId!, true).subscribe({
                    next: () => {
                        this.pollCreated = true;
                        this.cdr.markForCheck();
                    },
                    error: () => {
                        this.toast.error("Failed to update room state");
                    },
                });
            },
            error: () => {
                this.toast.error("Failed to add poll");
            },
        });
    }
}
