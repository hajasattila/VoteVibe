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
    templateUrl: './text-poll.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TextPollComponent implements OnInit {
    @Input() question!: string;
    @Input() options!: string[];

    selectedOption?: string;
    remainingOptions: string[] = [];

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
                this.options = room.poll.options;
                this.remainingOptions = [...this.options];
                this.cdr.markForCheck();
            }
        });
    }

    selectOption(option: string): void {
        this.selectedOption = option;
        this.remainingOptions = this.remainingOptions.filter(op => op !== option);
        this.cdr.markForCheck();
    }

    onOptionSelected(option: string): void {
        if (this.remainingOptions.includes(option)) {
            this.selectOption(option);
        }
    }
}
