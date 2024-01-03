import { animate, state, style, transition, trigger } from "@angular/animations";
import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
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
  selectedVoteType: string = "Text based";
  currentUserId: string | null = null;
  showSuggestions = false;
  isAuthenticated: boolean = false;
  friends: ProfileUser[] = [];
  showFriendList = false;
  enteredRoomCode: string = "";

  showRoomForm: boolean = false;
  showRoomDetails = false;
  showGenerateText = true;
  showRoomText = true;

  toggleRoomDetails() {
    this.showRoomDetails = !this.showRoomDetails;

    // Ha a generáló űrlapot meg akarjuk jeleníteni, akkor az esetlegesen megnyitott csatlakozó űrlapot el kell tüntetni
    if (this.showRoomDetails) {
      this.showRoomForm = false;
    }

    // A generáló szöveg és a generáló űrlap megjelenítésének kezelése
    this.showGenerateText = !this.showRoomDetails;
  }

  toggleRoomForm() {
    this.showRoomForm = !this.showRoomForm;

    // Ha a csatlakozó űrlapot meg akarjuk jeleníteni, akkor az esetlegesen megnyitott generáló űrlapot el kell tüntetni
    if (this.showRoomForm) {
      this.showRoomDetails = false;
      this.showGenerateText = true; // A "Generate a room" szöveg visszajelenítése
    }
  }

  toggleFriendList() {
    this.showFriendList = !this.showFriendList;
  }

  constructor(private router: Router, private authService: AuthService, private dbService: DatabaseService, private userService: UsersService, private toast: HotToastService) {
    this.roomCode = this.generateRoomCode(6, 12);
  }

  ngOnInit() {
    this.loadFriends();

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

  loadFriends() {
    this.authService.getCurrentUser().subscribe((user) => {
      if (user) {
        this.userService.getFriends(user.uid).subscribe((friends) => {
          this.friends = friends;
        });
      }
    });
  }

  createRoom(): void {
    if (!this.currentUser) {
      this.toast.error("You must be logged in to create a room.");
      return;
    }
    if (!this.roomName) {
      this.toast.error("You must give a room name");
      return;
    }

    const timeLimitInHours = Number(this.selectedTimeLimit);
    let timeLimitInMilliseconds = timeLimitInHours * 3600000;
    let futureTime = Date.now() + timeLimitInMilliseconds;
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
      endTime: {
        seconds: Math.floor(futureTime / 1000),
        nanoseconds: (futureTime % 1000) * 1000000,
      },
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
          next: () => {
            this.toast.success("Room successfully created with code: " + this.roomCode);

            // Increase the games count for the current user
            if (this.currentUser) {
              this.currentUser.games = (this.currentUser.games || 0) + 1;

              // Update the current user in the database using UsersService
              this.userService.updateUser(this.currentUser).subscribe();
            }
            this.router.navigate(["/room", this.roomCode]);
          },
          error: (error) => this.toast.error("Failed to create room: " + error.message),
        });
      });
  }

  joinRoom() {
    if (!this.enteredRoomCode) {
      this.toast.error("Please enter a room code.");
      return;
    }

    if (!this.currentUser) {
      this.toast.error("You must be logged in to join a room.");
      return;
    }

    // Now we can safely assert currentUser is not null.
    const currentUserId = this.currentUser.uid;

    this.dbService.getRoomByCode(this.enteredRoomCode).subscribe((room) => {
      if (!room) {
        this.toast.error("No such room code.");
        return;
      }

      if (!room.docId) {
        this.toast.error("Room data is incomplete. Missing document ID.");
        return;
      }

      // Here we check if the currentUser is already a member of the room.
      if (room.members.some((member) => member.uid === currentUserId)) {
        this.toast.info("You are already a member of this room.");
      } else {
        // We can assert that docId and currentUser are not null or undefined here.
        this.dbService.updateRoomMembers(room.docId, this.currentUser!).subscribe(
          () => {
            this.toast.success("Successfully joined the room.");
            if (this.currentUser) {
              this.currentUser.polls = (this.currentUser.polls || 0) + 1;
              this.userService.updateUser(this.currentUser).subscribe();
            }
          },
          (error) => {
            this.toast.error("There was an error joining the room: " + error.message);
          }
        );
      }
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
