import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
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
import {ProfileUser} from "../../../api/models/user.model";
import {SnackbarService} from "../../../api/services/snackbar-service/snackbar-service.service";
import {of, switchMap} from "rxjs";
import {map} from "rxjs/operators";
import {ChartOptions} from "../../../api/models/chartOptions.model";
import {CacheService} from "../../../api/services/cache-service/cache.service";


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
                private http: HttpClient,
                private snackbar: SnackbarService,
                private cacheService: CacheService,
                private cdr: ChangeDetectorRef


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

    loadedImages: Record<string, boolean> = {};
    randomUsersNotFriends: ProfileUser[] = [];

    isRandomUsersLoading: boolean = true;

    public lastRoomCharts: { title: string, code: string, options: ChartOptions }[] = [];

    isStatsLoading: boolean = true;


    ngOnInit(): void {
        this.loadLastRoomStats();
        this.loadFriendListWithCache();

        this.authService.getCurrentUser().subscribe(user => {
            if (user?.uid) {
                this.currentUserUid = user.uid;

                this.userService.getUserById(user.uid).subscribe(profile => {
                    if (profile?.displayName && profile.displayName !== this.nickname) {
                        this.nickname = profile.displayName;
                        localStorage.setItem('nickname', this.nickname);
                    }
                });
            }
        });

        this.loadLatestUsers();
        this.getMotivationalQuote();

        const cachedName = localStorage.getItem('nickname');
        if (cachedName) {
            this.nickname = cachedName;
        }

        this.route.queryParams.subscribe(params => {
            const openModal = params['openModal'];
            if (openModal === 'rooms') {
                this.openRoomModal();
            } else if (openModal === 'invites') {
                this.openInviteModal();
            }
        });
    }
    private loadFriendListWithCache(): void {
        const cachedFriendsStr = sessionStorage.getItem('friendList');
        const cachedUid = sessionStorage.getItem('friendListUid');

        this.authService.getCurrentUser().subscribe(user => {
            if (!user?.uid) return;

            const memoryFriends = this.cacheService.getFriends(user.uid);

            if (memoryFriends) {
                this.loadRandomUsersNotFriends(user.uid, memoryFriends);
                return;
            }

            if (cachedFriendsStr && cachedUid === user.uid) {
                const parsed = JSON.parse(cachedFriendsStr) as ProfileUser[];
                this.cacheService.setFriends(user.uid, parsed);
                this.loadRandomUsersNotFriends(user.uid, parsed);
                return;
            }

            this.userService.getFriendsLive(user.uid).subscribe(friends => {
                sessionStorage.setItem('friendList', JSON.stringify(friends));
                sessionStorage.setItem('friendListUid', user.uid);
                this.cacheService.setFriends(user.uid, friends);
                this.loadRandomUsersNotFriends(user.uid, friends);
            });
        });
    }

    private loadRandomUsersNotFriends(currentUid: string, friends: ProfileUser[]): void {
        this.userService.getUsersNotInFriendList(currentUid).pipe(
            map(users =>
                users.filter(u =>
                    u.uid !== currentUid &&
                    !friends.some(f => f.uid === u.uid)
                )
            )
        ).subscribe(filtered => {
            this.randomUsersNotFriends = this.getRandomUsers(filtered, 5);
            this.isRandomUsersLoading = false;
            this.cdr.detectChanges();
        });
    }



    private loadLatestUsers(): void {
        this.authService.getCurrentUser().pipe(
            switchMap(currentUser => {
                if (!currentUser?.uid) return of([]);
                return this.userService.getFriends(currentUser.uid).pipe(
                    switchMap(friends => {

                        const friendUids = friends.map(f => f.uid);
                        return this.userService.getLatestUsers(20).pipe(
                            map(users => users
                                .filter(u => u.uid !== currentUser.uid && !friendUids.includes(u.uid))
                                .slice(0, 5)
                            )
                        );
                    })
                );
            })
        )
    }

    private getRandomUsers(users: ProfileUser[], count: number): ProfileUser[] {
        const shuffled = [...users].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }


    sendFriendRequest(user: ProfileUser): void {
        if (!this.currentUserUid || !user.uid) return;

        this.userService.sendFriendRequest(this.currentUserUid, user.uid).subscribe({
            next: () => {
                this.translate.get('search.successRequestSent', {name: user.displayName || 'felhasználó'})
                    .subscribe(msg => this.snackbar.success(msg));
            },
            error: () => {
                this.translate.get('search.errorSendFailed', {name: user.displayName || 'felhasználó'})
                    .subscribe(msg => this.snackbar.error(msg));
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


    private loadLastRoomStats(): void {
        const memoryCache = this.cacheService.getRooms();
        const cachedHash = sessionStorage.getItem('lastRoomHash');
        const cachedCharts = sessionStorage.getItem('lastRoomCharts');

        if (cachedCharts && cachedHash) {
            this.lastRoomCharts = JSON.parse(cachedCharts);
            this.isStatsLoading = false;
        }

        this.authService.getCurrentUser().subscribe(user => {
            if (!user?.uid) return;

            if (memoryCache) {
                this.processRooms(memoryCache, cachedHash, cachedCharts);
                return;
            }

            this.dbService.getRoomsForUser(user.uid).subscribe(rooms => {
                this.cacheService.setRooms(rooms);
                this.processRooms(rooms, cachedHash, cachedCharts);
            });
        });
    }
    private processRooms(rooms: RoomModel[], cachedHash: string | null, cachedCharts: string | null): void {
        const sortedRooms = rooms
            .filter(room => !!room.pollResults && !!room.poll?.options)
            .sort((a, b) => {
                const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
                const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
                return dateB - dateA;
            })
            .slice(0, 3);

        const roomHash = JSON.stringify(sortedRooms.map(r => ({
            id: r.roomId,
            updated: (r.updatedAt || r.createdAt)?.toString()
        })));

        if (roomHash === cachedHash && cachedCharts) return;

        const isDark = document.documentElement.classList.contains('dark');

        this.lastRoomCharts = sortedRooms.map(room => {
            const labels = room.poll!.options;
            const pollResults = room.pollResults!;
            const code = room.roomId;

            const series = labels.map(option => {
                return Object.values(pollResults).reduce((sum, userVotes) => {
                    return sum + (userVotes?.[option] || 0);
                }, 0);
            });

            return {
                title: room.roomName,
                code: code,
                options: {
                    series,
                    chart: {
                        type: 'pie',
                        height: '100%',
                        width:'100%'
                    },
                    labels,
                    title: {
                        text: room.roomName,
                        style: {
                            color: isDark ? '#f3f4f6' : '#1f2937',
                            fontSize: '18px',
                            fontWeight: 'bold'
                        }
                    },
                    theme: {
                        mode: isDark ? 'dark' : 'light'
                    },
                    legend: {
                        labels: {
                            colors: isDark ? '#f3f4f6' : '#1f2937'
                        }
                    },
                    responsive: [
                        {
                            breakpoint: 480,
                            options: {
                                chart: {
                                    width: 280
                                },
                                legend: {
                                    position: 'bottom'
                                }
                            }
                        }
                    ]
                }
            };
        });

        sessionStorage.setItem('lastRoomHash', roomHash);
        sessionStorage.setItem('lastRoomCharts', JSON.stringify(this.lastRoomCharts));
        this.isStatsLoading = false;
    }
    navigateToRoomByCode(code: string): void {
        this.router.navigate(['/room', code, 'stats']);
    }




}
