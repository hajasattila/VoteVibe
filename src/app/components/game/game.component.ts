import { Component, OnInit } from "@angular/core";
import { HotToastService } from "@ngneat/hot-toast";
import { take } from "rxjs";
import { Room } from "src/app/models/room";
import { ProfileUser } from "src/app/models/user";
import { AuthService } from "src/app/services/auth.service";
import { DatabaseService } from "src/app/services/database.service";
import { UsersService } from "src/app/services/users.service";
@Component({
  selector: "app-game",
  templateUrl: "./game.component.html",
  styleUrls: ["./game.component.css"],
})
export class GameComponent implements OnInit {
  roomCode: string;
  currentUser: ProfileUser | null = null;
  roomName: string = "";
  selectedTimeLimit: number = 1;
  selectedVoteType: string = "Kép alapú";
  currentUserId: string | null = null;
  showSuggestions = false;
  isAuthenticated: boolean = false;
  showRoomDetails = false;
  showGenerateText = true;
  

  toggleRoomDetails() {
    this.showGenerateText = false; // Azonnal eltünteti a "Generate a room" szöveget
    this.showRoomDetails = true;
  }

  constructor(
    private authService: AuthService,
    private dbService: DatabaseService,
    private userService: UsersService,
    private toast: HotToastService // Inject the toast service
  ) {
    this.roomCode = this.generateRoomCode(6, 12);
  }

  ngOnInit() {
    this.authService.getCurrentUser().subscribe((user) => {
      if (user) {
        this.isAuthenticated = true;
        this.currentUserId = user.uid;
        this.userService.getUserById(user.uid).subscribe((profileUser) => {
          this.currentUser = profileUser;
        });
      } else {
        this.isAuthenticated = false;
        this.currentUserId = null;
      }
    });
  }

  createRoom(): void {
    // Ensure the current user exists before attempting to create a room
    if (!this.currentUser) {
      this.toast.error("You must be logged in to create a room.");
      return;
    }
    if (!this.roomName) {
      this.toast.error("You must give a room name");
      return;
    }

    const timeLimitInHours = Number(this.selectedTimeLimit);
    // Define the room outside so it's accessible in the entire method scope
    let newRoom: Room = {
      roomId: this.roomCode,
      roomName: this.roomName,
      creator: this.currentUser,
      members: [this.currentUser],
      voteType: this.selectedVoteType,
      connectionCode: this.roomCode,
      timeLimit: this.selectedTimeLimit,
      startTime: new Date(),
      endTime: new Date(Date.now() + timeLimitInHours * 3600000),
    };

    // Check if the roomId already exists in the database
    this.dbService
      .roomIdExists(this.roomCode)
      .pipe(take(1))
      .subscribe((exists: boolean) => {
        if (exists) {
          // If the roomId exists, generate a new one and inform the user
          this.roomCode = this.generateRoomCode(6, 12);
          this.toast.info("Room ID already exists. Generated a new room code: " + this.roomCode);

          // Update the newRoom object with the new roomCode
          newRoom.roomId = this.roomCode;
          newRoom.connectionCode = this.roomCode;
        }

        // Now, proceed to use your database service to save the new room
        this.dbService.createRoom(newRoom).subscribe({
          next: () => this.toast.success("Room successfully created with code: " + this.roomCode),
          error: (error) => this.toast.error("Failed to create room: " + error.message),
        });
      });
  }

  // Method to generate a random room code
  generateRoomCode(minLength: number, maxLength: number): string {
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
}
