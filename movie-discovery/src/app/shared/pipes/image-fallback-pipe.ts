import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'imageFallback',
})
export class ImageFallbackPipe implements PipeTransform {
  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }
}
