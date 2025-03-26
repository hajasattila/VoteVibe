import {Injectable} from '@angular/core';
import {MatSnackBar, MatSnackBarConfig} from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class SnackbarService {
    constructor(private snackBar: MatSnackBar) {}

    success(message: string) {
        this.snackBar.open(message, 'X', {
            duration: 4000,
            horizontalPosition: 'end',
            verticalPosition: 'bottom',
            panelClass: ['custom-snackbar', 'snackbar-success']
        });
    }

    error(message: string) {
        this.snackBar.open(message, 'X', {
            duration: 4000,
            horizontalPosition: 'end',
            verticalPosition: 'bottom',
            panelClass: ['custom-snackbar', 'snackbar-error']
        });
    }

    info(message: string) {
        this.snackBar.open(message, 'X', {
            duration: 4000,
            horizontalPosition: 'end',
            verticalPosition: 'bottom',
            panelClass: ['custom-snackbar', 'snackbar-info']
        });
    }
}


