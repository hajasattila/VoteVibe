import {
    Component,
    Input,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    OnInit
} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {DatabaseService} from "src/api/services/database-service/database.service";

@Component({
    selector: "app-text-poll",
    templateUrl: "./text-poll.component.html",
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TextPollComponent implements OnInit {
    @Input() question!: string;
    @Input() options!: string[];

    allOptions: string[] = [];
    comparedPairs: Set<string> = new Set();

    leftOption?: string;
    rightOption?: string;

    constructor(
        private dbService: DatabaseService,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef
    ) {
    }

    ngOnInit(): void {
        const roomCode = this.route.snapshot.paramMap.get('code');
        if (roomCode) this.loadPollData(roomCode);
    }

    loadPollData(roomCode: string): void {
        this.dbService.getRoomByCode(roomCode).subscribe((room) => {
            if (room?.poll) {
                this.question = room.poll.question;
                this.allOptions = [...room.poll.options];

                console.log('[Init] Opciók:', this.allOptions);

                const shuffled = [...this.allOptions].sort(() => 0.5 - Math.random());
                this.leftOption = shuffled[0];
                this.rightOption = shuffled[1];

                if (this.leftOption && this.rightOption) {
                    this.addComparedPair(this.leftOption, this.rightOption);
                }

                const totalOptions = this.allOptions.length;
                const totalCombinations = (totalOptions * (totalOptions - 1)) / 2;
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
        const unused = this.allOptions.filter(option => {
            const pairKey = this.getPairKey(selected, option);
            return option !== selected && !this.comparedPairs.has(pairKey);
        });

        if (unused.length === 0) return undefined;

        const randomIndex = Math.floor(Math.random() * unused.length);
        return unused[randomIndex];
    }

    onOptionSelected(option: string, side: 'left' | 'right'): void {
        const currentLeft = this.leftOption;
        const currentRight = this.rightOption;

        const oppositeSide = side === 'left' ? 'right' : 'left';
        const staticOption = side === 'left' ? currentLeft : currentRight;

        if (!staticOption || option !== staticOption) {
            console.log('[Figyelmeztetés] Nem az aktuális oldal opciójára kattintottál.');
            return;
        }

        const newOption = this.getUncomparedOptionFor(option);

        if (newOption) {
            this.addComparedPair(option, newOption);
            if (side === 'left') {
                this.leftOption = option;
                this.rightOption = newOption;
            } else {
                this.rightOption = option;
                this.leftOption = newOption;
            }
        } else {
            if (side === 'left') {
                this.leftOption = option;
                this.rightOption = undefined;
            } else {
                this.rightOption = option;
                this.leftOption = undefined;
            }
            console.log(`[Info] Nincs több új opció "${option}" mellé.`);
        }

        console.log(`[Statisztika] Eddig ${this.comparedPairs.size} összehasonlítást végeztél.`);
        console.log(`[Statisztika] Összes opció: ${this.allOptions.length}`);

        this.cdr.markForCheck();
    }

    getRemainingOptions(): string[] {
        return this.allOptions.filter(opt => {
            const pairLeft = this.leftOption ? this.getPairKey(opt, this.leftOption) : '';
            const pairRight = this.rightOption ? this.getPairKey(opt, this.rightOption) : '';
            return opt !== this.leftOption &&
                opt !== this.rightOption &&
                !this.comparedPairs.has(pairLeft) &&
                !this.comparedPairs.has(pairRight);
        });
    }
}
