import {
    Component,
    ChangeDetectionStrategy,
    HostListener,
    ElementRef,
    OnInit,
    OnDestroy, ChangeDetectorRef, ViewChildren, QueryList
} from '@angular/core';
import {AuthService} from "../../../api/services/auth-service/auth.service";
import {UsersService} from "../../../api/services/users-service/users.service";
import {Router, NavigationEnd} from "@angular/router";
import {ThemeService} from "../../../api/services/theme-service/theme-service.service";
import {Observable, Subscription} from "rxjs";
import {filter, map} from "rxjs/operators";
import {TranslateService} from "@ngx-translate/core";

@Component({
    selector: 'app-nav-bar',
    templateUrl: './nav-bar.component.html',
    styleUrls: ['./nav-bar.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavBarComponent implements OnInit, OnDestroy {
    @ViewChildren('friendDropdownRef, friendDropdownReff') friendDropdownRefs!: QueryList<ElementRef>;


    protected user$ = this.usersService.currentUserProfile$;
    protected navbarOpen = false;
    protected profileDropdownOpen = false;

    private routerSubscription!: Subscription;
    protected previousUrl: string = '';

    protected hasFriendRequests$!: Observable<boolean>;
    protected friendRequestDropdownOpen = false;
    protected incomingFriendNames: string[] = [];


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

        this.hasFriendRequests$ = this.usersService.currentUserProfile$.pipe(
            map(user => {
                if (!!user && Array.isArray(user.friendRequests) && user.friendRequests.length > 0) {
                    this.loadFriendRequestNames(user.friendRequests);
                    return true;
                }
                return false;
            })
        );

        this.routerSubscription = this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe((event) => {
                const navigation = event as NavigationEnd;

                if (this.navbarOpen && window.innerWidth < 768) {
                    this.navbarOpen = false;
                    this.cdr.detectChanges();
                }
                this.profileDropdownOpen = false;
                this.friendRequestDropdownOpen = false;
                this.previousUrl = navigation.urlAfterRedirects;
            });
    }

    loadFriendRequestNames(requestIds: string[]): void {
        const uniqueNames = new Set<string>();
        this.incomingFriendNames = [];

        requestIds.forEach(id => {
            this.usersService.getUserById(id).subscribe(requester => {
                if (requester?.displayName && !uniqueNames.has(requester.displayName)) {
                    uniqueNames.add(requester.displayName);
                    this.incomingFriendNames.push(requester.displayName);
                    this.cdr.markForCheck();
                }
            });
        });
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
        const clickTarget = event.target as HTMLElement;

        if (
            this.profileDropdownOpen &&
            !this.eRef.nativeElement.contains(clickTarget)
        ) {
            this.profileDropdownOpen = false;
        }

        if (
            this.friendRequestDropdownOpen &&
            this.friendDropdownRefs &&
            !this.friendDropdownRefs.some(ref => ref.nativeElement.contains(clickTarget))
        ) {
            this.friendRequestDropdownOpen = false;
        }
    }
}
