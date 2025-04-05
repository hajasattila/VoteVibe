import { Injectable } from '@angular/core';
import anime from 'animejs/lib/anime.es.js';

@Injectable({
    providedIn: 'root'
})
export class FireworkService {
    private canvasEl!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private colors = ['#FF1461', '#18FF92', '#5A87FF', '#FBF38C'];
    private numberOfParticules = 30;

    initCanvas(): void {
        this.canvasEl = document.querySelector('.fireworks')!;
        this.ctx = this.canvasEl.getContext('2d')!;
        this.setCanvasSize();

        anime({
            duration: Infinity,
            update: () => {
                this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
            }
        });

        window.addEventListener('resize', this.setCanvasSize.bind(this), false);
    }

    trigger(x: number, y: number): void {
        const circle = this.createCircle(x, y);
        const particules = Array.from({ length: this.numberOfParticules }, () => this.createParticule(x, y));

        anime.timeline().add({
            targets: particules,
            x: (p: any) => p.endPos.x,
            y: (p: any) => p.endPos.y,
            radius: 0.1,
            duration: anime.random(1200, 1800),
            easing: 'easeOutExpo',
            update: this.renderParticule.bind(this)
        });

        anime({
            targets: circle,
            radius: anime.random(80, 160),
            lineWidth: 0,
            alpha: {
                value: 0,
                easing: 'linear',
                duration: anime.random(600, 800)
            },
            duration: anime.random(1200, 1800),
            easing: 'easeOutExpo',
            update: this.renderParticule.bind(this)
        });
    }

    private renderParticule(anim: any): void {
        anim.animatables.forEach((a: any) => a.target.draw());
    }

    private setCanvasSize(): void {
        if (!this.canvasEl || !this.ctx) return;
        this.canvasEl.width = window.innerWidth * 2;
        this.canvasEl.height = window.innerHeight * 2;
        this.canvasEl.style.width = window.innerWidth + 'px';
        this.canvasEl.style.height = window.innerHeight + 'px';
        this.ctx.scale(2, 2);
    }

    private createParticule(x: number, y: number): any {
        const p: any = {};
        p.x = x;
        p.y = y;
        p.color = this.colors[anime.random(0, this.colors.length - 1)];
        p.radius = anime.random(16, 32);
        p.endPos = this.setParticuleDirection(p);
        p.draw = () => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI, true);
            this.ctx.fillStyle = p.color;
            this.ctx.fill();
        };
        return p;
    }

    private setParticuleDirection(p: { x: number; y: number }): { x: number; y: number } {
        const angle = anime.random(0, 360) * Math.PI / 180;
        const radius = anime.random(50, 180);
        return {
            x: p.x + radius * Math.cos(angle),
            y: p.y + radius * Math.sin(angle)
        };
    }

    private createCircle(x: number, y: number): any {
        const p: any = {};
        p.x = x;
        p.y = y;
        p.color = '#FFF';
        p.radius = 0.1;
        p.alpha = .5;
        p.lineWidth = 6;
        p.draw = () => {
            this.ctx.globalAlpha = p.alpha;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI, true);
            this.ctx.lineWidth = p.lineWidth;
            this.ctx.strokeStyle = p.color;
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
        };
        return p;
    }
}
