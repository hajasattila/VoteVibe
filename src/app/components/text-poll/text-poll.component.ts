import {
    Component,
    Input,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    OnInit
} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {DatabaseService} from "src/api/services/database-service/database.service";
import {FireworkService} from "../../../api/services/firework-service/firework.service";
import {AuthService} from "../../../api/services/auth-service/auth.service";
import {User} from "@angular/fire/auth";
import {interval, Subscription} from "rxjs";
import {TranslateService} from "@ngx-translate/core";

@Component({
    selector: "app-text-poll",
    templateUrl: "./text-poll.component.html",
    styleUrls: ["./text-poll.component.css"],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TextPollComponent implements OnInit {
    currentUser: User | null = null;
    roomDocId: string | null = null;

    private clickSound = new Audio('https://www.soundjay.com/buttons/sounds/button-4.mp3');

    @Input() question!: string;
    @Input() options!: string[];

    allOptions: string[] = [];
    comparedPairs: Set<string> = new Set();

    leftOption?: string;
    rightOption?: string;

    showWinnerModal = false;
    winnerOption?: string;
    remainingCombinations = 0;

    voteCounts: Record<string, number> = {};

    selectedSide: 'left' | 'right' | null = null;
    animateIncoming: 'left' | 'right' | null = null;

    touchStartX = 0;
    swipeDirection: 'left' | 'right' | null = null;
    showHandHint: boolean = true;

    dragOffsetX: number = 0;
    activeDragSide: 'left' | 'right' | null = null;
    isDragging: boolean = false;
    loading: boolean = true;
    hasAlreadyVoted: boolean = false;
    isResettingVote: boolean = false;
    hasRevoted = false;

    remainingTime = '';
    private timerSubscription?: Subscription;


    constructor(
        private dbService: DatabaseService,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef,
        private fireworkService: FireworkService,
        private authService: AuthService,
        private translate: TranslateService,
    ) {
    }

    ngOnInit(): void {
        this.authService.getCurrentUser().subscribe(user => {
            this.currentUser = user;
        });

        this.clickSound.load();
        this.fireworkService.initCanvas();

        const roomCode = this.route.snapshot.paramMap.get('code');
        if (roomCode) this.loadPollData(roomCode);
    }

    loadPollData(roomCode: string): void {
        this.dbService.getRoomByCode(roomCode).subscribe((room) => {
            if (room?.poll) {
                this.animateIncomingLeft = false;
                this.animateIncomingRight = false;
                this.animateIncoming = null;
                this.disappearSide = null;
                this.disappearDirection = null;
                this.selectedSide = null;
                this.voteCounts = {};
                this.leftOption = undefined;
                this.rightOption = undefined;
                this.showWinnerModal = false;
                this.comparedPairs.clear();

                this.roomDocId = room.docId ?? null;
                const currentUser = this.currentUser;

                if (!currentUser) {
                    this.loading = false;
                    return;
                }

                const displayKey =
                    currentUser.displayName?.trim() ||
                    currentUser.email?.trim() ||
                    currentUser.uid;

                const pollResults = (room as any).pollResults as Record<string, Record<string, number>> ?? {};
                const userVotes = pollResults[displayKey];
                this.hasAlreadyVoted = !!userVotes;

                console.log('[ℹ️ hasAlreadyVoted]:', this.hasAlreadyVoted);

                if (this.hasAlreadyVoted && !this.hasRevoted && userVotes) {
                    const topOption = Object.entries(userVotes)
                        .sort((a: [string, number], b: [string, number]) => b[1] - a[1])[0]?.[0] ?? null;

                    if (topOption) {
                        this.winnerOption = topOption;
                        this.showWinnerModal = true;
                        this.voteCounts = userVotes;
                    }

                    this.loading = false;
                    this.cdr.markForCheck();
                    return;
                }

                this.question = room.poll.question;
                this.allOptions = [...new Set(room.poll.options)];

                const shuffled = [...this.allOptions].sort(() => 0.5 - Math.random());
                this.leftOption = shuffled[0];
                this.rightOption = shuffled.find(o => o !== this.leftOption);

                if (this.leftOption && this.rightOption) {
                    this.addComparedPair(this.leftOption, this.rightOption);
                }

                const totalOptions = this.allOptions.length;
                this.remainingCombinations = (totalOptions * (totalOptions - 1)) / 2;

                if (room.endTime?.seconds) {
                    const endTime = new Date(room.endTime.seconds * 1000);
                    const now = Date.now();
                    const diff = endTime.getTime() - now;

                    if (diff <= 0) {
                        this.remainingTime = this.translate.instant('room.expired');
                    } else {
                        this.remainingTime = this.convertMsToTime(diff);
                        this.startTimer(endTime);
                    }
                }

                this.loading = false;
                this.cdr.markForCheck();
            }
        });
    }

    startTimer(endTime: Date): void {
        this.timerSubscription?.unsubscribe();
        this.timerSubscription = interval(1000).subscribe(() => {
            const diff = endTime.getTime() - Date.now();
            if (diff <= 0) {
                this.remainingTime = this.translate.instant('room.expired');
                this.timerSubscription?.unsubscribe();
                this.cdr.markForCheck();
            } else {
                this.remainingTime = this.convertMsToTime(diff);
                this.cdr.markForCheck();
            }
        });
    }

    convertMsToTime(ms: number): string {
        const sec = Math.floor((ms / 1000) % 60);
        const min = Math.floor((ms / (1000 * 60)) % 60);
        const hrs = Math.floor((ms / (1000 * 60 * 60)) % 24);
        return `${hrs} h ${min} m ${sec} s`;
    }


    addComparedPair(a: string, b: string): void {
        if (a === b) return;
        const key = this.getPairKey(a, b);
        this.comparedPairs.add(key);
    }

    getPairKey(a: string, b: string): string {
        return [a, b].sort().join('|||');
    }

    getUncomparedOptionFor(selected: string): string | undefined {
        return this.allOptions.find(option => {
            const pairKey = this.getPairKey(selected, option);
            return option !== selected && !this.comparedPairs.has(pairKey);
        });
    }

    disappearSide: 'left' | 'right' | null = null;
    disappearDirection: 'left' | 'right' | null = null;

    onOptionSelected(option: string, side: 'left' | 'right', event: MouseEvent): void {
        this.showHandHint = false;

        const staticOption = side === 'left' ? this.leftOption : this.rightOption;
        if (!staticOption || option !== staticOption) return;
        if (this.selectedSide) return;

        this.disappearSide = side === 'left' ? 'right' : 'left';
        this.disappearDirection = this.disappearSide === 'left' ? 'left' : 'right';

        this.selectedSide = side;
        this.voteCounts[option] = (this.voteCounts[option] || 0) + 1;

        this.clickSound.volume = 0.05;
        this.clickSound.currentTime = 0;
        this.clickSound.play().catch(err => console.warn('Hanghiba:', err));

        this.fireworkService.trigger(event.clientX, event.clientY);

        const newOption = this.getUncomparedOptionFor(option);

        if (newOption) {
            this.addComparedPair(option, newOption);

            setTimeout(() => {
                if (side === 'left') {
                    this.leftOption = option;
                    this.rightOption = newOption;
                    this.animateIncoming = 'right';
                } else {
                    this.rightOption = option;
                    this.leftOption = newOption;
                    this.animateIncoming = 'left';
                }

                this.selectedSide = null;
                this.disappearSide = null;
                this.disappearDirection = null;

                setTimeout(() => {
                    this.animateIncoming = null;
                    this.cdr.markForCheck();
                }, 400);

                this.cdr.markForCheck();
            }, 700);
        } else {
            this.winnerOption = option;
            this.showWinnerModal = true;

            if (side === 'left') {
                this.leftOption = option;
                this.rightOption = undefined;
            } else {
                this.rightOption = option;
                this.leftOption = undefined;
            }

            this.printTop3Votes();
        }

        this.cdr.markForCheck();
    }

    async printTop3Votes(): Promise<void> {
        if (!this.winnerOption || !this.currentUser || !this.roomDocId) return;

        const baseKey = this.currentUser.displayName?.trim() || this.currentUser.email?.trim() || this.currentUser.uid;
        const finalKey = this.hasAlreadyVoted ? `${baseKey}_revote` : baseKey;

        const completedVoteCounts: Record<string, number> = {};
        this.allOptions.forEach(option => {
            completedVoteCounts[option] = this.voteCounts[option] || 0;
        });

        await this.dbService.savePollResultToRoom(this.roomDocId, {
            [finalKey]: completedVoteCounts
        });

        console.log('[💾 Mentve Firestore-ba]:', {
            [finalKey]: completedVoteCounts
        });
    }

    closeWinnerModal(): void {
        this.showWinnerModal = false;
        this.cdr.markForCheck();
    }

    onTouchStart(event: TouchEvent, side: 'left' | 'right') {
        this.showHandHint = false;
        this.touchStartX = event.touches[0].clientX;
        this.activeDragSide = side;
        this.dragOffsetX = 0;
        this.isDragging = true;
    }

    onTouchMove(event: TouchEvent) {
        if (!this.isDragging) return;
        const currentX = event.touches[0].clientX;
        this.dragOffsetX = currentX - this.touchStartX;
    }

    animateIncomingLeft: boolean = false;
    animateIncomingRight: boolean = false;

    onTouchEnd(option: string, event: TouchEvent) {
        const touchEndX = event.changedTouches[0].clientX;
        const deltaX = touchEndX - this.touchStartX;

        if (!this.activeDragSide) return;

        const element = document.querySelector(`.option-${this.activeDragSide}`) as HTMLElement;
        const elementWidth = element?.offsetWidth || 0;
        const swipeThreshold = elementWidth / 2;

        const chosenSide = this.activeDragSide === 'left' ? 'right' : 'left';
        const chosenOption = chosenSide === 'left' ? this.leftOption! : this.rightOption!;

        if (Math.abs(deltaX) > swipeThreshold) {
            const direction = deltaX > 0 ? 'right' : 'left';
            this.disappearSide = this.activeDragSide;
            this.disappearDirection = direction;
            this.selectedSide = chosenSide;

            this.voteCounts[chosenOption] = (this.voteCounts[chosenOption] || 0) + 1;

            this.clickSound.volume = 0.05;
            this.clickSound.currentTime = 0;
            this.clickSound.play().catch(err => console.warn('Hanghiba:', err));

            if (element) {
                const rect = element.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                this.fireworkService.trigger(centerX, centerY);
            }

            const newOption = this.getUncomparedOptionFor(chosenOption);

            if (newOption) {
                this.addComparedPair(chosenOption, newOption);
                setTimeout(() => {
                    if (chosenSide === 'left') {
                        this.leftOption = chosenOption;
                        this.rightOption = newOption;
                        this.animateIncomingRight = true;
                    } else {
                        this.rightOption = chosenOption;
                        this.leftOption = newOption;
                        this.animateIncomingLeft = true;
                    }

                    setTimeout(() => {
                        this.animateIncomingLeft = false;
                        this.animateIncomingRight = false;
                        this.resetSwipeState();
                        this.cdr.markForCheck();
                    }, 400);

                    this.resetSwipeState();
                }, 700);
            } else {
                this.winnerOption = chosenOption;
                this.showWinnerModal = true;

                if (chosenSide === 'left') {
                    this.leftOption = chosenOption;
                    this.rightOption = undefined;
                } else {
                    this.rightOption = chosenOption;
                    this.leftOption = undefined;
                }

                this.printTop3Votes();
            }

            this.cdr.markForCheck();
        } else {
            this.resetSwipeState();
            this.cdr.markForCheck();
        }
    }

    get dragOpacity(): number {
        const distance = Math.abs(this.dragOffsetX);
        return Math.max(1 - distance / 200, 0.5);
    }

    resetSwipeState(side?: 'left' | 'right'): void {
        if (!side || side === 'left') {
            if (this.activeDragSide === 'left') this.activeDragSide = null;
            this.dragOffsetX = 0;
        }
        if (!side || side === 'right') {
            if (this.activeDragSide === 'right') this.activeDragSide = null;
            this.dragOffsetX = 0;
        }

        if (!side) {
            this.swipeDirection = null;
            this.disappearSide = null;
            this.disappearDirection = null;
            this.selectedSide = null;
            this.isDragging = false;
            setTimeout(() => this.animateIncoming = null, 400);
        }
    }

    resetPollForUser(): void {
        if (!this.currentUser || !this.roomDocId) return;

        this.isResettingVote = true;

        const baseKey =
            this.currentUser.displayName?.trim() ||
            this.currentUser.email?.trim() ||
            this.currentUser.uid;

        const keysToRemove = [baseKey, `${baseKey}_revote`];

        Promise.all(
            keysToRemove.map(key =>
                this.dbService.removePollResultFromRoom(this.roomDocId!, key)
            )
        )
            .then(() => {
                this.hasRevoted = false;
                this.hasAlreadyVoted = false;
                this.voteCounts = {};
                this.winnerOption = undefined;
                this.showWinnerModal = false;
                this.comparedPairs.clear();
                this.showHandHint = true;
                this.remainingCombinations = 0;
                this.leftOption = undefined;
                this.rightOption = undefined;
                this.selectedSide = null;
                this.animateIncoming = null;
                this.disappearSide = null;
                this.disappearDirection = null;
                this.animateIncomingLeft = false;
                this.animateIncomingRight = false;
                this.dragOffsetX = 0;
                this.activeDragSide = null;
                this.isDragging = false;

                const roomCode = this.route.snapshot.paramMap.get('code');
                if (roomCode) {
                    setTimeout(() => {
                        this.loadPollData(roomCode);
                    });
                }

                this.isResettingVote = false;
                this.cdr.markForCheck();
            })
            .catch(error => {
                console.error('[❌ Hiba a válaszok törlésekor]', error);
                this.isResettingVote = false;
            });
    }


}
