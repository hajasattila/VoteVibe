// src/app/shared/services/image-compressor.service.ts
import {Injectable} from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ImageCompressorService {

    compressImage(file: File, quality: number = 0.7, maxWidth: number = 800): Promise<File> {
        return new Promise((resolve, reject) => {
            const image = new Image();
            const reader = new FileReader();

            reader.readAsDataURL(file);
            reader.onload = (event: any) => {
                image.src = event.target.result;

                image.onload = () => {
                    const canvas = document.createElement('canvas');
                    const scaleSize = maxWidth / image.width;
                    canvas.width = maxWidth;
                    canvas.height = image.height * scaleSize;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject('Nem sikerült canvas contextet létrehozni.');

                    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const compressedFile = new File([blob], file.name.replace(/\.(jpg|jpeg|png)$/i, '.webp'), {
                                    type: 'image/webp',
                                    lastModified: Date.now(),
                                });
                                resolve(compressedFile);
                            } else {
                                reject('Nem sikerült létrehozni tömörített blobot.');
                            }
                        },
                        'image/webp', // <-- ez itt a kulcs!
                        quality
                    );
                };

                image.onerror = (error) => reject('Hiba a kép betöltésénél: ' + error);
            };
        });
    }
}
