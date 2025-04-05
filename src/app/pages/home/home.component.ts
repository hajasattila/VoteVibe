import {ChangeDetectorRef, Component, ElementRef, OnInit} from '@angular/core';
import {AuthService} from 'src/api/services/auth-service/auth.service';
import {Router} from "@angular/router";
import {UsersService} from "../../../api/services/users-service/users.service";
import {ThemeService} from "../../../api/services/theme-service/theme-service.service";
import {TranslateService} from "@ngx-translate/core";

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {

    constructor(private readonly authService: AuthService, private readonly router: Router,
                protected themeService: ThemeService,
                protected translate: TranslateService) {
    }

    protected menuOpen = false;


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

    public isLargeScreen = window.innerWidth >= 1024;

    toggleSideMenu() {
        this.menuOpen = !this.menuOpen;
    }

}
