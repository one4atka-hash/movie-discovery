import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'imageFallback',
})
export class ImageFallbackPipe implements PipeTransform {
  transform(_value: unknown, ..._args: unknown[]): unknown {
    return null;
  }
}
