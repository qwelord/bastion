export type DragPoint = { x: number; y: number };
// Pointer events can arrive faster than the display refresh rate.
export class DragMotion {
  private frame: number | null = null;
  private latest: DragPoint | null = null;
  constructor(
    private draw: (point: DragPoint) => void,
    private request: (callback: FrameRequestCallback) => number = requestAnimationFrame,
    private cancelFrame: (id: number) => void = cancelAnimationFrame,
  ) {}
  move(x: number, y: number) {
    this.latest = { x, y };
    if (this.frame !== null) return;
    this.frame = this.request(() => {
      this.frame = null;
      if (this.latest) this.draw(this.latest);
    });
  }
  flush() {
    if (this.latest) this.draw(this.latest);
  }
  cancel() {
    if (this.frame !== null) this.cancelFrame(this.frame);
    this.frame = null;
    this.latest = null;
  }
}
