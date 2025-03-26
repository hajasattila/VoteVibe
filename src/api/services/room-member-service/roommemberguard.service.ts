import { Injectable } from "@angular/core";
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from "@angular/router";
import { Observable } from "rxjs";
import { AuthService } from "../auth-service/auth.service";
import { DatabaseService } from "../database-service/database.service";
import { map, take } from "rxjs/operators";

@Injectable({
  providedIn: "root",
})
export class RoomMemberGuard implements CanActivate {
  constructor(private authService: AuthService, private dbService: DatabaseService, private router: Router) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean | UrlTree> {
    const roomCode = route.paramMap.get("code");
    if (!roomCode) {
      return false;
    }

    try {
      const currentUser = await this.authService.getCurrentUser().pipe(take(1)).toPromise();

      if (!currentUser) {
        return this.router.parseUrl("/login");
      }

      const room = await this.dbService.getRoomByCode(roomCode).pipe(take(1)).toPromise();

      if (room && room.members.some((member) => member.uid === currentUser.uid)) {
        return true;
      } else {
        return this.router.parseUrl("**");
      }
    } catch (error) {
      console.error(error);
      return this.router.parseUrl("**");
    }
  }
}
