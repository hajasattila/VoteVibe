import {Component, OnInit} from '@angular/core';
import {AuthService} from 'src/api/services/auth-service/auth.service';
import {Router} from "@angular/router";
import {ThemeService} from "../../../api/services/theme-service/theme-service.service";
import {TranslateService} from "@ngx-translate/core";
import {Room} from "../../../api/models/room";
import {UsersService} from "../../../api/services/users-service/users.service";

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
                private userService: UsersService,) {
    }

    protected menuOpen = false;
    showRoomModal: boolean = false;
    userRooms: Room[] = [];


    ngOnInit(): void {
        this.initLanguage();

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

    openRoomModal(): void {
        this.showRoomModal = true;

        this.authService.getCurrentUser().subscribe((user) => {
            if (user) {
                this.userService.getUserById(user.uid).subscribe((profileUser) => {
                    this.userRooms = profileUser?.gameRooms || [];
                });
            }
        });
    }

    closeRoomModal(): void {
        this.showRoomModal = false;
    }

    navigateToRoom(room: Room): void {
        this.closeRoomModal();
        this.router.navigate(['/room', room.roomId]);
    }

}
