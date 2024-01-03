import { NgModule } from "@angular/core";
import { NavigationEnd, Router, RouterModule, Routes } from "@angular/router";
import { HomeComponent } from "./components/home/home.component";
import { LandingComponent } from "./components/landing/landing.component";
import { LoginComponent } from "./components/login/login.component";
import { SignUpComponent } from "./components/sign-up/sign-up.component";
import { canActivate, redirectLoggedInTo, redirectUnauthorizedTo } from "@angular/fire/auth-guard";
import { ProfileComponent } from "./components/profile/profile.component";
import { GameComponent } from "./components/game/game.component";
import { RoomDetailsComponent } from "./room-details/room-details.component";
import { RoomMemberGuard } from "./services/roommemberguard.service";
import { PageNotFoundComponent } from "./components/page-not-found/page-not-found.component";

const redirectUnauthorizedToLogin = () => redirectUnauthorizedTo(["login"]);
const redirectLoggedInToHome = () => redirectLoggedInTo(["home"]);

const routes: Routes = [
  {
    path: "",
    pathMatch: "full",
    component: LandingComponent,
  },
  {
    path: "login",
    component: LoginComponent,
    ...canActivate(redirectLoggedInToHome),
  },
  {
    path: "sign-up",
    component: SignUpComponent,
    ...canActivate(redirectLoggedInToHome),
  },
  {
    path: "home",
    component: HomeComponent,
    ...canActivate(redirectUnauthorizedToLogin),
  },
  {
    path: "profile",
    component: ProfileComponent,
    ...canActivate(redirectUnauthorizedToLogin),
  },
  {
    path: "game",
    component: GameComponent,
  },
  { path: "room/:code", component: RoomDetailsComponent, canActivate: [RoomMemberGuard] },
  {
    path: "notfound",
    component: PageNotFoundComponent,
  },
  { path: "**", redirectTo: "notfound" },
];

@NgModule({
  declarations: [],
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
/* Az oldal tetejére jön mindig ha routerrel váltok oldalt.*/
export class AppRoutingModule {
  constructor(router: Router) {
    router.events.subscribe((event: any) => {
      if (event instanceof NavigationEnd) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }
}
