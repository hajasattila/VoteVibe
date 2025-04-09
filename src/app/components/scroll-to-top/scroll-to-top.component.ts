import {Component, HostListener, OnInit} from "@angular/core";
import {Router, NavigationEnd} from "@angular/router";
import {filter} from "rxjs/operators";

@Component({
    selector: "app-scroll-to-top",
    templateUrl: "./scroll-to-top.component.html",
    styleUrls: ["./scroll-to-top.component.css"],
})
export class ScrollToTopComponent implements OnInit {
    showScrollButton: boolean = false;
    allowedRoutes: string[] = ['/', '/steps', '/profile', '/login', '/sign-up'];
    isRouteAllowed: boolean = false;

    constructor(private router: Router) {
    }

    ngOnInit() {
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd)
        ).subscribe((event: NavigationEnd) => {
            this.isRouteAllowed = this.allowedRoutes.includes(event.urlAfterRedirects);
        });
    }


    @HostListener("window:scroll")
    onWindowScroll() {
        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        this.showScrollButton = scrollPosition > 100 && this.isRouteAllowed;
    }

    scrollToTop() {
        window.scrollTo({top: 0, behavior: 'smooth'});
    }
}
