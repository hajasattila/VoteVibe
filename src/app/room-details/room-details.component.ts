import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { DatabaseService } from "../services/database.service";
import { Room } from "../models/room";
import { interval, Subscription } from "rxjs";
import { map } from "rxjs/operators";

@Component({
  selector: "app-room-details",
  templateUrl: "./room-details.component.html",
  styleUrls: ["./room-details.component.css"],
})
export class RoomDetailsComponent implements OnInit, OnDestroy {
  room: Room | null = null;
  remainingTime: string = "";
  private timerSubscription: Subscription | null = null;
  // Add a property to store the poll options
  options: string[] = [""];

  constructor(private route: ActivatedRoute, private dbService: DatabaseService) {}

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
  addOption() {
    this.options.push(""); // Adds a new empty string to represent the new option
  }

  // Method to remove an option field
  removeOption(index: number) {
    if (this.options.length > 1) {
      this.options.splice(index, 1); // Remove the option at the given index
    }
  }
}
