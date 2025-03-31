import {Component, OnInit} from "@angular/core";
import {FormBuilder, Validators} from "@angular/forms";
import {Router} from "@angular/router";
import {AuthService} from "src/api/services/auth-service/auth.service";
import {TranslateService} from "@ngx-translate/core";
import {SnackbarService} from "../../../api/services/snackbar-service/snackbar-service.service";

@Component({
    selector: "app-login",
    templateUrl: "./login.component.html",
    styleUrls: ["./login.component.scss"],
})
export class LoginComponent implements OnInit {
    loginForm = this.fb.group({
        email: ["", [Validators.required, Validators.email]],
        password: ["", Validators.required],
        remember: [false],
    });

    public showPassword = false;

    constructor(
        private authService: AuthService,
        private snackbar: SnackbarService,
        private router: Router,
        private fb: FormBuilder,
        private translate: TranslateService
    ) {
    }

    ngOnInit() {
        this.loadSavedCredentials();
    }

    loadSavedCredentials() {
        const savedEmail = localStorage.getItem('email');
        const savedPassword = localStorage.getItem('password');
        const remember = Boolean(localStorage.getItem('remember'));

        this.loginForm.patchValue({
            email: savedEmail || '',
            password: savedPassword || '',
            remember: remember
        });
    }

    saveCredentials(email: string, password: string, remember: boolean) {
        if (remember) {
            localStorage.setItem("email", email);
            localStorage.setItem("password", password);
        } else {
            localStorage.removeItem("email");
            localStorage.removeItem("password");
        }
        localStorage.setItem("remember", remember.toString());
    }

    togglePasswordVisibility() {
        this.showPassword = !this.showPassword;
    }

    get email() {
        return this.loginForm.get("email");
    }

    get password() {
        return this.loginForm.get("password");
    }

    submit() {
        const {email, password, remember} = this.loginForm.value;

        if (!this.loginForm.valid || !email || !password) {
            return;
        }

        this.saveCredentials(email, password, Boolean(remember));

        this.authService.login(email, password).subscribe({
            next: () => {
                this.translate.get('login.success').subscribe(msg =>
                    this.snackbar.success(msg)
                );
                this.router.navigate(['/home']);
            },
            error: (err) => {
                this.translate.get('login.error').subscribe(msg =>
                    this.snackbar.error(msg + ': ' + err.message)
                );
            }
        });
    }

    resetPassword() {
        const email = this.loginForm.get("email")?.value;

        if (!email) {
            this.translate.get('login.invalidEmail').subscribe(msg =>
                this.snackbar.error(msg)
            );
            return;
        }

        this.authService.resetPassword(email).subscribe({
            next: () => {
                this.translate.get('login.resetSuccess').subscribe(msg =>
                    this.snackbar.success(msg)
                );
            },
            error: (err) => {
                this.translate.get('login.resetError').subscribe(msg =>
                    this.snackbar.error(msg + ': ' + err.message)
                );
            }
        });
    }

    async loginGitHub() {
        try {
            await this.authService.loginWithGithub().toPromise();
            this.translate.get('login.githubSuccess').subscribe(msg =>
                this.snackbar.success(msg)
            );
            this.router.navigate(['/home']);
        } catch (error: any) {
            this.translate.get('login.githubError').subscribe(msg =>
                this.snackbar.error(msg + ': ' + (error?.message || ''))
            );
            console.error('GitHub Login Error:', error);
        }
    }
}
