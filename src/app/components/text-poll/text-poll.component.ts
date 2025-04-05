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

@Component({
    selector: "app-text-poll",
    templateUrl: "./text-poll.component.html",
    styleUrls: ["./text-poll.component.css"],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TextPollComponent implements OnInit {
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


    constructor(
        private dbService: DatabaseService,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef,
        private fireworkService: FireworkService
    ) {
    }

    ngOnInit(): void {
        this.clickSound.load();
        this.fireworkService.initCanvas();

        const roomCode = this.route.snapshot.paramMap.get('code');
        if (roomCode) this.loadPollData(roomCode);
    }

    loadPollData(roomCode: string): void {
        this.dbService.getRoomByCode(roomCode).subscribe((room) => {
            if (room?.poll) {
                this.question = room.poll.question;
                this.allOptions = [...new Set(room.poll.options)] as string[];

                const shuffled = [...this.allOptions].sort(() => 0.5 - Math.random());
                this.leftOption = shuffled[0];
                this.rightOption = shuffled.find(o => o !== this.leftOption);

                if (this.leftOption && this.rightOption) {
                    this.addComparedPair(this.leftOption, this.rightOption);
                    console.log(`[Init] "${this.leftOption}" vs "${this.rightOption}"`);
                }

                const totalOptions = this.allOptions.length;
                const totalCombinations = (totalOptions * (totalOptions - 1)) / 2;
                this.remainingCombinations = totalCombinations;
                this.cdr.markForCheck();
            }
        });
    }

    addComparedPair(a: string, b: string): void {
        if (a === b) return;
        const key = this.getPairKey(a, b);
        this.comparedPairs.add(key);
        console.log(`[Rögzítve párosítás] "${a}" vs "${b}"`);
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

        console.log(`[CLICK] "${option}" opció lett kiválasztva (${side} oldal).`);

        const staticOption = side === 'left' ? this.leftOption : this.rightOption;
        if (!staticOption || option !== staticOption) return;
        if (this.selectedSide) return;

        if (!(event instanceof MouseEvent)) return;

        this.disappearSide = side === 'left' ? 'right' : 'left';
        this.disappearDirection = this.disappearSide === 'left' ? 'left' : 'right';

        this.selectedSide = side;
        this.voteCounts[option] = (this.voteCounts[option] || 0) + 1;


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

                console.log(`[Új összehasonlítás] "${this.leftOption}" vs "${this.rightOption}"`);

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

            console.log(`[Info] A győztes opció: ${this.winnerOption}`);
            this.printTop3Votes();
        }

        this.cdr.markForCheck();
    }


    printTop3Votes(): void {
        if (!this.winnerOption) return;

        console.log('[Szavazatok összesítése]');
        this.allOptions.forEach(option => {
            const count = this.voteCounts[option] || 0;
            console.log(`- "${option}": ${count} szavazat`);
        });

        const filteredVotes = Object.entries(this.voteCounts)
            .filter(([option]) => option !== this.winnerOption)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2);

        console.log('\n[Top 3] Legtöbb szavazatot kapott opciók:');
        console.log(`1. "${this.winnerOption}" – ${this.voteCounts[this.winnerOption] || 0} szavazat`);

        filteredVotes.forEach(([option, count], index) => {
            console.log(`${index + 2}. "${option}" – ${count} szavazat`);
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


}
