import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, Event } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {

  protected visibility: boolean = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.events
        .pipe(
            filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd)
        )
        .subscribe(event => {
          this.visibility = event.urlAfterRedirects === '/';
        });
  }
}
