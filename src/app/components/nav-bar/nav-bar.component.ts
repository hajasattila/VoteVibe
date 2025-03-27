import {
    Component,
    ChangeDetectionStrategy,
    HostListener,
    ElementRef,
    OnInit,
    OnDestroy, ChangeDetectorRef
} from '@angular/core';
import {AuthService} from "../../../api/services/auth-service/auth.service";
import {UsersService} from "../../../api/services/users-service/users.service";
import {Router, NavigationEnd} from "@angular/router";
import {ThemeService} from "../../../api/services/theme-service/theme-service.service";
import {Subscription} from "rxjs";
import {filter} from "rxjs/operators";
import {TranslateService} from "@ngx-translate/core";

@Component({
    selector: 'app-nav-bar',
    templateUrl: './nav-bar.component.html',
    styleUrls: ['./nav-bar.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavBarComponent implements OnInit, OnDestroy {
    protected user$ = this.usersService.currentUserProfile$;
    protected navbarOpen = false;
    protected profileDropdownOpen = false;

    private routerSubscription!: Subscription;
    private previousUrl: string = '';
    protected navbarAnimating = false;


    constructor(
        private authService: AuthService,
        public usersService: UsersService,
        private router: Router,
        protected themeService: ThemeService,
        private eRef: ElementRef,
        private cdr: ChangeDetectorRef,
        protected translate: TranslateService
    ) {
        this.themeService.initTheme();
        this.initLanguage();
    }

    ngOnInit(): void {
        this.previousUrl = this.router.url;

        this.routerSubscription = this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe((event) => {
                const navigation = event as NavigationEnd;

                if (this.navbarOpen && window.innerWidth < 768) {
                    this.navbarOpen = false;
                    this.cdr.detectChanges();
                }
                this.profileDropdownOpen = false;
                this.previousUrl = navigation.urlAfterRedirects;
            });


    }

    changeLanguage(event: Event) {
        const lang = (event.target as HTMLSelectElement).value;
        this.translate.use(lang);
        localStorage.setItem('lang', lang);
    }

    initLanguage() {
        const savedLang = localStorage.getItem('lang') || 'hu';
        this.translate.setDefaultLang('hu');
        this.translate.use(savedLang);
    }

    ngOnDestroy(): void {
        if (this.routerSubscription) {
            this.routerSubscription.unsubscribe();
        }
    }

    toggleNavbar() {
        this.navbarOpen = !this.navbarOpen;
    }

    toggleProfileDropdown() {
        this.profileDropdownOpen = !this.profileDropdownOpen;
    }

    logout() {
        this.profileDropdownOpen = false;
        this.authService.logout().subscribe(() => {
            this.router.navigate(['/']);
        });
    }

    @HostListener('document:click', ['$event'])
    handleClickOutside(event: Event): void {
        if (
            this.profileDropdownOpen &&
            !this.eRef.nativeElement.contains(event.target)
        ) {
            this.profileDropdownOpen = false;
        }
    }
}
