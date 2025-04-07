import {Component, OnInit} from '@angular/core';
import {AuthService} from 'src/api/services/auth-service/auth.service';
import {Router} from "@angular/router";
import {ThemeService} from "../../../api/services/theme-service/theme-service.service";
import {TranslateService} from "@ngx-translate/core";
import {Room} from "../../../api/models/room";
import {UsersService} from "../../../api/services/users-service/users.service";
import {RoomInvite} from "../../../api/models/roomInvitation";
import {DatabaseService} from "../../../api/services/database-service/database.service";
import {ActivatedRoute} from '@angular/router';


@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {

    constructor(private readonly authService: AuthService,
                private readonly router: Router,
                protected themeService: ThemeService,
                protected translate: TranslateService,
                private userService: UsersService,
                protected dbService: DatabaseService,
                private route: ActivatedRoute,) {
    }

    protected menuOpen = false;
    showRoomModal: boolean = false;
    userRooms: Room[] = [];

    showRoomInviteModal = false;
    roomInvites: RoomInvite[] = [];


    currentUserUid: string | null = null;

    ngOnInit(): void {
        this.authService.getCurrentUser().subscribe(user => {
            this.currentUserUid = user?.uid || null;
        });

        this.route.queryParams.subscribe(params => {
            const openModal = params['openModal'];
            if (openModal === 'rooms') {
                this.openRoomModal();
            } else if (openModal === 'invites') {
                this.openInviteModal();
            }
        });
    }


    logout() {
        this.authService.logout().subscribe(() => {
            this.router.navigate(['/']);
        });
    }

    toggleTheme(): void {
        this.themeService.toggleTheme();
    }

    changeLanguage(event: Event): void {
        const lang = (event.target as HTMLSelectElement).value;
        this.translate.use(lang);
        localStorage.setItem('lang', lang);
    }

    initLanguage(): void {
        const savedLang = localStorage.getItem('lang') || 'hu';
        this.translate.setDefaultLang('hu');
        this.translate.use(savedLang);
    }

    toggleSideMenu() {
        this.menuOpen = !this.menuOpen;
    }

    isRoomLoading: boolean = false;

    openRoomModal(): void {
        this.showRoomModal = true;
        this.isRoomLoading = true;

        this.authService.getCurrentUser().subscribe((user) => {
            if (user) {
                this.dbService.getRoomsForUser(user.uid).subscribe((rooms) => {
                    this.userRooms = rooms;
                    this.isRoomLoading = false;
                });
            } else {
                this.isRoomLoading = false;
            }
        });

        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { openModal: null },
            queryParamsHandling: 'merge'
        });
    }



    closeRoomModal(): void {
        this.showRoomModal = false;

        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {openModal: null},
            queryParamsHandling: 'merge'
        });

    }

    navigateToRoom(room: Room): void {
        this.closeRoomModal();
        this.router.navigate(['/room', room.roomId]);
    }

    openInviteModal(): void {
        this.showRoomInviteModal = true;

        this.authService.getCurrentUser().subscribe((user) => {
            if (user) {
                this.userService.getRoomInvites(user.uid).subscribe((invites) => {
                    this.roomInvites = invites.filter(invite => invite.status === 'pending');
                });
            }
        });
    }

    closeInviteModal(): void {
        this.showRoomInviteModal = false;

        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {openModal: null},
            queryParamsHandling: 'merge'
        });
    }


    acceptInvite(invite: RoomInvite): void {
        this.authService.getCurrentUser().subscribe(user => {
            if (!user) {
                return;
            }

            this.userService.getUserById(user.uid).subscribe(profile => {
                if (!profile) {
                    return;
                }
                this.dbService.addUserToRoomByCode(invite.roomId, profile).subscribe(() => {
                    this.userService.updateInviteStatus(user.uid, invite.roomId, 'accepted').subscribe(() => {
                        this.router.navigate(['room', invite.roomId])
                    });
                });
            });
        });
    }


    rejectInvite(invite: RoomInvite): void {
        this.authService.getCurrentUser().subscribe(user => {
            if (user) {
                this.userService.updateInviteStatus(user.uid, invite.roomId, 'rejected').subscribe(() => {
                    this.roomInvites = this.roomInvites.filter(i => i.roomId !== invite.roomId);
                });
            }
        });
    }

    loadUserRooms(): void {
        this.authService.getCurrentUser().subscribe(user => {
            if (!user) return;

            this.dbService.getRoomsForUser(user.uid).subscribe(rooms => {
                console.log('🧩 Szobák, amikben benne van a user:', rooms);
                this.userRooms = rooms;
            });
        });
    }


}
