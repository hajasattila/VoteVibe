import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ThemeService {
    private renderer: Renderer2;
    private themeKey = 'theme';
    private darkClass = 'dark';

    private currentThemeSubject = new BehaviorSubject<'light' | 'dark'>('light');
    currentTheme$ = this.currentThemeSubject.asObservable();

    constructor(rendererFactory: RendererFactory2) {
        this.renderer = rendererFactory.createRenderer(null, null);
        this.initTheme();
    }

    initTheme(): void {
        const savedTheme = localStorage.getItem(this.themeKey);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            this.setDarkTheme();
        } else {
            this.setLightTheme();
        }
    }

    isDark(): boolean {
        return document.documentElement.classList.contains(this.darkClass);
    }

    toggleTheme(): void {
        this.isDark() ? this.setLightTheme() : this.setDarkTheme();
    }

    setDarkTheme(): void {
        this.renderer.addClass(document.documentElement, this.darkClass);
        localStorage.setItem(this.themeKey, 'dark');
        this.currentThemeSubject.next('dark');
    }

    setLightTheme(): void {
        this.renderer.removeClass(document.documentElement, this.darkClass);
        localStorage.setItem(this.themeKey, 'light');
        this.currentThemeSubject.next('light');
    }

}
