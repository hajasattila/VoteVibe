import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/api/services/auth-service/auth.service';
import { UsersService } from 'src/api/services/users-service/users.service';
import {Router} from "@angular/router";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  user$ = this.usersService.currentUserProfile$;

  constructor(private usersService: UsersService, private readonly authService: AuthService, private readonly router: Router) { }

  ngOnInit(): void {}

  logout() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/']);
    });
  }
}
