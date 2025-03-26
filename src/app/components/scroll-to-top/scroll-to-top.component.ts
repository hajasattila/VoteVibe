import { Component, HostListener } from "@angular/core";

@Component({
  selector: "app-scroll-to-top",
  templateUrl: "./scroll-to-top.component.html",
  styleUrls: ["./scroll-to-top.component.css"],
})
export class ScrollToTopComponent {
  showScrollButton: boolean = false;

  @HostListener("window:scroll")
  onWindowScroll() {
    const scrollPosition = window.scrollY || document.documentElement.scrollTop;
    this.showScrollButton = scrollPosition > 100;
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
