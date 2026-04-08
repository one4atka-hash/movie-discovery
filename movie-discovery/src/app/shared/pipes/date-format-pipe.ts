import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateFormat',
})
export class DateFormatPipe implements PipeTransform {
  transform(_value: unknown, ..._args: unknown[]): unknown {
    return null;
  }
}
