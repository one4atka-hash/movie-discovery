import { DestroyRef, Directive, ElementRef, EventEmitter, Input, Output, inject } from '@angular/core';

@Directive({
  selector: '[appInfiniteScroll]',
  standalone: true
})
export class InfiniteScrollDirective {
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  @Input() disabled = false;
  @Input() rootMargin = '200px 0px';
  @Input() threshold: number | number[] = 0;

  @Output() reached = new EventEmitter<void>();

  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    // ensure cleanup
    this.destroyRef.onDestroy(() => this.disconnect());

    this.observer = new IntersectionObserver(
      (entries) => {
        if (this.disabled) return;
        if (entries.some((e) => e.isIntersecting)) {
          this.reached.emit();
        }
      },
      { root: null, rootMargin: this.rootMargin, threshold: this.threshold }
    );

    this.observer.observe(this.host);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}

