import { Component, OnInit } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { HotToastService } from "@ngneat/hot-toast";
import { AuthService } from "src/app/services/auth.service";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
})
export class LoginComponent implements OnInit {
  loginForm = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", Validators.required],
    remember: [false], // Add this line
  });

  public showPassword = false;

  constructor(private authService: AuthService, private toast: HotToastService, private router: Router, private fb: FormBuilder) {}

  ngOnInit() {
    this.loadSavedCredentials();
  }

  loadSavedCredentials() {
    const savedEmail = localStorage.getItem('email');
    const savedPassword = localStorage.getItem('password');
    const remember = Boolean(localStorage.getItem('remember')); // Convert the string to a boolean
  
    this.loginForm.patchValue({
      email: savedEmail || '',
      password: savedPassword || '',
      remember: remember // This is now guaranteed to be a boolean
    });
  }
  

  saveCredentials(email: string, password: string, remember: boolean) {
    if (remember) {
      // Only set the email and password if remember is true
      localStorage.setItem("email", email);
      localStorage.setItem("password", password);
    } else {
      // If remember is false, clear any previously stored credentials
      localStorage.removeItem("email");
      localStorage.removeItem("password");
    }
    // Always update the remember state to reflect the user's choice
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
    const { email, password, remember } = this.loginForm.value;
  
    if (!this.loginForm.valid || !email || !password) {
      return;
    }
  
    // Coerce remember to be a boolean
    this.saveCredentials(email, password, Boolean(remember));
  
    this.authService
      .login(email, password)
      .pipe(
        this.toast.observe({
          success: 'Logged in successfully',
          loading: 'Logging in...',
          error: ({ message }) => `There was an error: ${message}`,
        })
      )
      .subscribe(() => {
        this.router.navigate(['/home']);
      });
  }
  
  resetPassword() {
    const email = this.loginForm.get("email")?.value;
    if (email) {
      // Ha 'email' nem null vagy undefined
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
          error: ({ message }) => `There was an error: ${message}`,
        })
      )
      .subscribe(() => {
        console.log("Password reset email sent successfully");
      });
  }

  // Function to trigger GitHub login
  async loginGitHub() {
    try {
      const credential = await this.authService.loginWithGithub().toPromise();
      this.toast.success('Logged in successfully with GitHub');
      this.router.navigate(['/home']); // Navigate to the home page or dashboard after successful login
    } catch (error) {
      this.toast.error(`Login failed: ${onmessage}`); // Display an error message
      console.error('GitHub Login Error:', error);
    }
  }
}
