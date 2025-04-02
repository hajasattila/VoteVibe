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
                this.allOptions = [...room.poll.options];

                const shuffled = [...this.allOptions].sort(() => 0.5 - Math.random());
                this.leftOption = shuffled[0];
                this.rightOption = shuffled[1];

                if (this.leftOption && this.rightOption) {
                    this.addComparedPair(this.leftOption, this.rightOption);
                }

                const totalOptions = this.allOptions.length;
                const totalCombinations = (totalOptions * (totalOptions - 1)) / 2;
                this.remainingCombinations = totalCombinations;

                console.log(`[Init] Összes opció: ${totalOptions}`);
                console.log(`[Init] Lehetséges összehasonlítások száma: ${totalCombinations}`);
                this.cdr.markForCheck();
            }
        });
    }

    addComparedPair(a: string, b: string): void {
        const pairKey = this.getPairKey(a, b);
        this.comparedPairs.add(pairKey);
        console.log(`[Log] Összehasonlítva: "${a}" vs "${b}"`);
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

    selectedSide: 'left' | 'right' | null = null;
    animateIncoming: 'left' | 'right' | null = null;

    onOptionSelected(option: string, side: 'left' | 'right', event: MouseEvent): void {
        this.clickSound.volume = 0.05;
        this.clickSound.currentTime = 0;
        this.clickSound.play().catch(err => console.warn('Hanghiba:', err));

        const staticOption = side === 'left' ? this.leftOption : this.rightOption;

        if (!staticOption || option !== staticOption) {
            console.log('[Figyelmeztetés] Nem az aktuális oldal opciójára kattintottál.');
            return;
        }

        if (this.selectedSide) return;
        this.selectedSide = side;

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
        }

        this.cdr.markForCheck();
    }

    closeWinnerModal(): void {
        this.showWinnerModal = false;
        this.cdr.markForCheck();
    }


}
