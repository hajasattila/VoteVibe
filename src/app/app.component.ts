import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {AuthService} from '../api/services/auth-service/auth.service';
import {UsersService} from '../api/services/users-service/users.service';
import {HttpClient} from "@angular/common/http";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {

    constructor(private http: HttpClient) {
        console.log('HttpClient működik!');
    }

    ngOnInit(): void {
        const circles = document.querySelector('.circles');
        const numberOfCircles = 25;

        if (circles) {
            for (let i = 0; i < numberOfCircles; i++) {
                const li = document.createElement('li');
                const left = Math.random() * 100;
                const size = Math.floor(Math.random() * 140) + 10;
                const delay = Math.random() * 3;
                const duration = Math.random() * 25 + 10;

                li.style.left = `${left}%`;
                li.style.width = `${size}px`;
                li.style.height = `${size}px`;
                li.style.animationDelay = `${delay}s`;
                li.style.animationDuration = `${duration}s`;

                circles.appendChild(li);
            }
        }
    }


}
