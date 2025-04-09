import {Component, OnInit} from '@angular/core';
import {AuthService} from 'src/api/services/auth-service/auth.service';
import {Router} from "@angular/router";
import {ThemeService} from "../../../api/services/theme-service/theme-service.service";
import {TranslateService} from "@ngx-translate/core";
import {RoomModel} from "../../../api/models/room.model";
import {UsersService} from "../../../api/services/users-service/users.service";
import {RoomInvite} from "../../../api/models/roomInvitation.model";
import {DatabaseService} from "../../../api/services/database-service/database.service";
import {ActivatedRoute} from '@angular/router';
import {HttpClient} from "@angular/common/http";
import {environment} from 'src/environments/environment';


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
                private route: ActivatedRoute,
                private http: HttpClient
    ) {
    }

    protected menuOpen = false;
    showRoomModal: boolean = false;
    userRooms: RoomModel[] = [];

    showRoomInviteModal = false;
    roomInvites: RoomInvite[] = [];

    currentUserUid: string | null = null;
    nickname: string | null = null;

    quote: string | null = null;


    ngOnInit(): void {
        const cachedName = localStorage.getItem('nickname');
        if (cachedName) {
            this.nickname = cachedName;
        }

        this.authService.getCurrentUser().subscribe(user => {
            this.currentUserUid = user?.uid || null;

            if (user?.uid) {
                this.userService.getUserById(user.uid).subscribe(profile => {
                    if (profile?.displayName && profile.displayName !== this.nickname) {
                        this.nickname = profile.displayName;
                        localStorage.setItem('nickname', this.nickname);
                    }
                });
            }
        });

        this.getMotivationalQuote();

        this.route.queryParams.subscribe(params => {
            const openModal = params['openModal'];
            if (openModal === 'rooms') {
                this.openRoomModal();
            } else if (openModal === 'invites') {
                this.openInviteModal();
            }
        });
    }


    getMotivationalQuote(forceRefresh = false): void {
        const now = new Date().getTime();
        const oneDay = 24 * 60 * 60 * 1000;

        if (!forceRefresh) {
            const cachedQuote = localStorage.getItem('daily_quote');
            const cachedTimestamp = localStorage.getItem('daily_quote_time');

            if (cachedQuote && cachedTimestamp && now - Number(cachedTimestamp) < oneDay) {
                this.quote = cachedQuote;
                return;
            }
        } else {
            localStorage.removeItem('daily_quote');
            localStorage.removeItem('daily_quote_time');
        }

        const headers = {
            'X-Api-Key': environment.quotesApiKey
        };

        this.http.get<any>('https://api.api-ninjas.com/v1/quotes', {headers})
            .subscribe({
                next: (data) => {
                    if (data.length > 0) {
                        this.quote = `"${data[0].quote}" — ${data[0].author}`;
                        localStorage.setItem('daily_quote', this.quote);
                        localStorage.setItem('daily_quote_time', now.toString());
                    }
                },
                error: (err) => {
                    console.error(err);
                    this.quote = null;
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
                    this.userRooms = rooms
                        .map(room => ({
                            ...room,
                            createdAt: this.normalizeTimestamp(room.createdAt)
                        }))
                        .sort((a, b) => {
                            const dateA = a.createdAt ? a.createdAt.getTime() : 0;
                            const dateB = b.createdAt ? b.createdAt.getTime() : 0;
                            return dateB - dateA;
                        })


                    this.isRoomLoading = false;
                });
            } else {
                this.isRoomLoading = false;
            }
        });

        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {openModal: null},
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

    navigateToRoom(room: RoomModel): void {
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

    private normalizeTimestamp(value: any): Date {
        if (value instanceof Date) {
            return value;
        }
        if (value?.seconds) {
            return new Date(value.seconds * 1000);
        }
        return new Date(0);
    }


}
