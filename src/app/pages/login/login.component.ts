import {Component, OnInit} from "@angular/core";
import {FormBuilder, Validators} from "@angular/forms";
import {Router} from "@angular/router";
import {HotToastService} from "@ngneat/hot-toast";
import {AuthService} from "src/api/services/auth-service/auth.service";

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

    constructor(private authService: AuthService, private toast: HotToastService, private router: Router, private fb: FormBuilder) {
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

        this.authService
            .login(email, password)
            .pipe(
                this.toast.observe({
                    success: 'Logged in successfully',
                    loading: 'Logging in...',
                    error: ({message}) => `There was an error: ${message}`,
                })
            )
            .subscribe(() => {
                this.router.navigate(['/home']);
            });
    }

    resetPassword() {
        const email = this.loginForm.get("email")?.value;
        if (email) {
            this.authService.resetPassword(email);
        }
        if (!email) {
            console.error("Invalid email address");
            return;
        }

        this.authService
            .resetPassword(email)
            .pipe(
                this.toast.observe({
                    success: "Password reset email sent successfully",
                    loading: "Sending password reset email...",
                    error: ({message}) => `There was an error: ${message}`,
                })
            )
            .subscribe(() => {
                console.log("Password reset email sent successfully");
            });
    }

    async loginGitHub() {
        try {
            const credential = await this.authService.loginWithGithub().toPromise();
            this.toast.success('Logged in successfully with GitHub');
            this.router.navigate(['/home']);
        } catch (error) {
            this.toast.error(`Login failed: ${onmessage}`);
            console.error('GitHub Login Error:', error);
        }
    }
}
