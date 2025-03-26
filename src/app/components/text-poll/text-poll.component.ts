// text-poll.component.ts
import { Component, Input } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { DatabaseService } from "src/api/services/database-service/database.service";

@Component({
  selector: "app-text-poll",
  templateUrl: './text-poll.component.html'
})
export class TextPollComponent {
  @Input() question!: string;
  @Input() options!: string[];

  selectedOption?: string;
  remainingOptions: string[] = [];

  constructor(
    private dbService: DatabaseService,
    private route: ActivatedRoute
  ) {}
  
  ngOnInit() {
    const roomCode = this.route.snapshot.paramMap.get('code');
    if (roomCode) {
      this.loadPollData(roomCode);
    }
  }

  loadPollData(roomCode: string) {
    this.dbService.getRoomByCode(roomCode).subscribe((room) => {
      if (room && room.poll) {
        this.question = room.poll.question;
        this.options = room.poll.options;
        this.remainingOptions = [...this.options];
        console.log("Az opciók inicializálása: ", this.options);
      } else {
        console.error('A szoba vagy a szavazás adatai nem találhatóak.');
      }
    });
  }

  selectOption(option: string): void {
    this.selectedOption = option;
    this.remainingOptions = this.remainingOptions.filter(op => op !== option);
  }

  onOptionSelected(option: string): void {
    if (this.remainingOptions.includes(option)) {
      this.selectOption(option);
    }
  }
}
