import { Component, OnInit, OnDestroy, ChangeDetectorRef } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { DatabaseService } from "../../services/database.service";
import { Room } from "../../models/room";
import { interval, Subscription } from "rxjs";
import { map } from "rxjs/operators";
import { HotToastService } from "@ngneat/hot-toast";

@Component({
  selector: "app-room-details",
  templateUrl: "./room-details.component.html",
  styleUrls: ["./room-details.component.css"],
})
export class RoomDetailsComponent implements OnInit, OnDestroy {
  room: Room | null = null;
  remainingTime: string = "";
  private timerSubscription: Subscription | null = null;
  options: string[] = ["", ""];
  question: string = "";
  pollCreated = false;

  constructor(private cdr: ChangeDetectorRef, private route: ActivatedRoute, private dbService: DatabaseService, private toast: HotToastService) {}

  ngOnInit() {
    const roomCode = this.route.snapshot.paramMap.get("code");
    if (roomCode) {
      this.loadRoomDetails(roomCode);
    }
  }

  loadRoomDetails(roomCode: string) {
    this.dbService.getRoomByCode(roomCode).subscribe((room: Room | null) => {
      if (room && room.endTime) {
        this.room = room;
        // Assuming room.endTime.seconds is the seconds since the Unix epoch
        const endTime = new Date(room.endTime.seconds * 1000); // Convert seconds to milliseconds
        if (!isNaN(endTime.getTime())) {
          this.startTimer(endTime);
        } else {
          console.error("Invalid endTime format:", room.endTime);
          this.remainingTime = "Invalid time format";
        }
      } else {
        // Handle the case when room is null
        console.error("Room is null.");
        this.remainingTime = "Room data is not available";
      }
    });
    if (this.room?.pollCreated) {
      this.pollCreated = true; // Ha már volt létrehozva szavazás, állítsd be a pollCreated-et true-ra
    }
  }

  startTimer(endTime: Date) {
    this.timerSubscription = interval(1000)
      .pipe(
        map(() => {
          const now = new Date();
          const diff = endTime.getTime() - now.getTime();
          return this.convertMsToTime(diff);
        })
      )
      .subscribe((time) => {
        this.remainingTime = time;
      });
  }

  convertMsToTime(milliseconds: number): string {
    if (milliseconds < 0) {
      return "Expired";
    }

    let seconds = Math.floor((milliseconds / 1000) % 60);
    let minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
    let hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24);

    return `${hours} h, ${minutes} m, ${seconds} s`;
  }

  ngOnDestroy() {
    this.timerSubscription?.unsubscribe();
  }
  addOption(): void {
    this.options.push("");
  }

  removeOption(index: number): void {
    if (this.options.length > 2) {
      this.options.splice(index, 1);
    }
  }
  trackByFn(index: any, item: any) {
    return index;
  }

  createPoll() {
    if (!this.room || !this.room.docId) {
      this.toast.error("Room details are missing");
      return;
    }
    if (this.question.trim() === "") {
      this.toast.error("The question is missing");
      return;
    }
    if (this.options.some((option) => option.trim() === "")) {
      this.toast.error("One or more options are missing");
      return;
    }

    const poll = {
      question: this.question,
      options: this.options.filter((option) => option.trim() !== ""),
    };

    this.dbService.addPollToRoom(this.room.docId, poll).subscribe({
      next: () => {
        this.toast.success("Poll added successfully");
        console.log("A szavazás létrehozva, állapot frissítése.");

        if (this.room && this.room.docId) {
          this.dbService.updateRoomPollState(this.room.docId, true).subscribe(() => {
            this.pollCreated = true;
/*             this.cdr.detectChanges(); */
          });
        } else {
          console.error("A szoba adatok nem érhetőek el az állapot frissítésekor.");
        }
      },
      error: (error) => {
        this.toast.error("Failed to add poll");
      },
    });
  }
}
