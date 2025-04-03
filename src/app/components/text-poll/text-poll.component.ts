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
    private clickSound = new Audio('asdhttps://www.soundjay.com/buttons/sounds/button-4.mp3');

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
    swipedOptionSide: 'left' | 'right' | null = null;

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

    onOptionSelected(option: string, side: 'left' | 'right', event: MouseEvent | TouchEvent): void {
        this.clickSound.volume = 0.05;
        this.clickSound.currentTime = 0;
        this.clickSound.play().catch(err => console.warn('Hanghiba:', err));

        if (!this.swipeDirection) {
            this.swipeDirection = side === 'left' ? 'right': "right"
        }


        const staticOption = side === 'left' ? this.leftOption : this.rightOption;
        if (!staticOption || option !== staticOption) return;
        if (this.selectedSide) return;

        this.selectedSide = side;
        this.voteCounts[option] = (this.voteCounts[option] || 0) + 1;

        this.fireworkService.trigger((event as MouseEvent).clientX, (event as MouseEvent).clientY);

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
                this.swipeDirection = null;
                this.swipedOptionSide = null;

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
        this.touchStartX = event.touches[0].clientX;
        this.swipedOptionSide = side;
    }

    onTouchEnd(option: string, event: TouchEvent) {
        const touchEndX = event.changedTouches[0].clientX;
        const deltaX = touchEndX - this.touchStartX;

        if (Math.abs(deltaX) > 40) {
            this.swipeDirection = deltaX > 0 ? 'right' : 'left';
            if (this.swipedOptionSide) {
                this.onOptionSelected(option, this.swipedOptionSide, event as any);
            }
        }
    }
}
