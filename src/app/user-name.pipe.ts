// user-name.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { UsersService } from './services/users.service';
import { map } from 'rxjs/operators';

@Pipe({ name: 'userName' })
export class UserNamePipe implements PipeTransform {
  constructor(private userService: UsersService) {}

  transform(userId: string) {
    return this.userService.getUserById(userId).pipe(
      map(user => user ? user.displayName : 'Unknown User')
    );
  }
}
