import {
  strengthCommands,
  trainingMove,
  type Candidate,
  type EngineKind,
  type Strength,
} from './strength';
type Transport = {
  postMessage(command: string): void;
  terminate(): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: { message?: string; preventDefault?: () => void }) => void) | null;
};
type Request = {
  position: string;
  strength: Strength;
  legalCount: number;
  kind: EngineKind;
  moveTime?: number;
  onDepth?: (depth: number) => void;
  analysis?: { lines: number; depth?: number };
};
export type AnalysisLine = {
  move: string;
  score: number;
  mate?: number;
  depth: number;
  pv: string[];
};
export type EngineReply = {
  move: string;
  name: string;
  depth: number;
  training: boolean;
  lines: AnalysisLine[];
};
const aborted = () => new DOMException('Поиск отменён', 'AbortError');
export class StockfishClient {
  private worker: Transport | null = null;
  private kind: EngineKind | null = null;
  private ready = false;
  private sequence = 0;
  private requesting = false;
  private name = 'Stockfish 19';
  private startup: {
    resolve: () => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;
  private pending: {
    request: Request;
    resolve: (reply: EngineReply) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
    candidates: Map<number, Candidate>;
    lines: Map<number, AnalysisLine>;
    depth: number;
  } | null = null;
  constructor(
    private factory: (kind: EngineKind) => Transport = (kind) =>
      new Worker(
        `/engine/stockfish-19-${kind === 'lite' ? 'lite-single' : 'single'}.js`,
      ) as unknown as Transport,
  ) {}
  private terminate(error: Error) {
    this.sequence++;
    this.requesting = false;
    if (this.startup) {
      clearTimeout(this.startup.timer);
      this.startup.reject(error);
      this.startup = null;
    }
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(error);
      this.pending = null;
    }
    if (this.worker) {
      this.worker.onmessage = null;
      this.worker.onerror = null;
      this.worker.terminate();
    }
    this.worker = null;
    this.ready = false;
    this.kind = null;
  }
  cancel() {
    if (this.startup || this.pending || this.requesting) this.terminate(aborted());
    else this.sequence++;
  }
  dispose() {
    this.terminate(aborted());
  }
  async load(kind: EngineKind) {
    await this.start(kind);
    return this.name;
  }
  private start(kind: EngineKind) {
    if (this.worker && this.kind === kind && this.ready) return Promise.resolve();
    this.terminate(aborted());
    this.kind = kind;
    return new Promise<void>((resolve, reject) => {
      try {
        const worker = this.factory(kind);
        this.worker = worker;
        const timer = setTimeout(
          () =>
            this.terminate(
              new Error('Движок не загрузился за 60 секунд. Повторите запуск или выберите Lite.'),
            ),
          60_000,
        );
        this.startup = { resolve, reject, timer };
        worker.onmessage = (event) => {
          if (this.worker !== worker) return;
          for (const line of String(event.data).split('\n')) this.receive(line.trim());
        };
        worker.onerror = (event) => {
          event.preventDefault?.();
          this.terminate(
            new Error(
              'Не удалось запустить Stockfish. Проверьте загрузку файлов движка и повторите попытку.',
            ),
          );
        };
        worker.postMessage('uci');
      } catch (error) {
        this.terminate(error instanceof Error ? error : new Error('Stockfish недоступен'));
        reject(error);
      }
    });
  }
  private receive(line: string) {
    if (line.startsWith('id name ')) this.name = line.slice(8);
    if (line === 'uciok') {
      this.worker?.postMessage('setoption name Hash value 32');
      this.worker?.postMessage('isready');
    }
    if (line === 'readyok' && this.startup) {
      const s = this.startup;
      this.startup = null;
      this.ready = true;
      clearTimeout(s.timer);
      s.resolve();
    }
    const p = this.pending;
    if (!p) return;
    const depth = line.match(/\bdepth (\d+)/);
    if (depth) {
      p.depth = Math.max(p.depth, Number(depth[1]));
      p.request.onDepth?.(p.depth);
    }
    const info = line.match(
      /\bmultipv (\d+).*?\bscore (cp|mate) (-?\d+).*?\bpv ([a-h][1-8][a-h][1-8][qrbn]?)/,
    );
    if (info) {
      const score = Number(info[3]);
      if (!line.includes('lowerbound') && !line.includes('upperbound')) {
        p.lines.set(Number(info[1]), {
          move: info[4],
          score: info[2] === 'mate' ? Math.sign(score) * (100000 - Math.abs(score)) : score,
          ...(info[2] === 'mate' ? { mate: score } : {}),
          depth: Number(depth?.[1] ?? 0),
          pv: (line.split(' pv ')[1] ?? '')
            .trim()
            .split(/\s+/)
            .filter((m) => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m))
            .slice(0, 24),
        });
      }
      p.candidates.set(Number(info[1]), {
        move: info[4],
        score: info[2] === 'mate' ? Math.sign(score) * (100000 - Math.abs(score)) : score,
        depth: Number(depth?.[1] ?? 0),
      });
    }
    if (line.startsWith('bestmove ')) {
      clearTimeout(p.timer);
      this.pending = null;
      this.requesting = false;
      const best = line.split(/\s+/)[1];
      const move =
        p.request.strength.mode === 'training'
          ? (trainingMove([...p.candidates.values()], p.request.strength.value) ?? best)
          : best;
      if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) {
        p.reject(new Error('Stockfish не вернул допустимый ход.'));
        return;
      }
      p.resolve({
        move,
        name: this.name,
        depth: p.depth,
        training: p.request.strength.mode === 'training',
        lines: [...p.lines.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v),
      });
    }
  }
  async search(request: Request): Promise<EngineReply> {
    if (/[\r\n]/.test(request.position) || !request.position.startsWith('position fen '))
      throw new Error('Некорректная позиция для движка.');
    this.cancel();
    const starting = this.start(request.kind);
    const expectedSequence = this.sequence;
    this.requesting = true;
    try {
      await starting;
    } catch (error) {
      if (expectedSequence === this.sequence) this.requesting = false;
      throw error;
    }
    const worker = this.worker;
    const sequence = this.sequence;
    if (!worker || !this.ready || expectedSequence !== this.sequence) throw aborted();
    return new Promise((resolve, reject) => {
      if (sequence !== this.sequence) {
        reject(aborted());
        return;
      }
      const timer = setTimeout(
        () =>
          this.terminate(
            new Error('Stockfish не ответил. Партия приостановлена, повторите запуск.'),
          ),
        20_000,
      );
      this.pending = {
        request,
        resolve,
        reject,
        timer,
        candidates: new Map(),
        lines: new Map(),
        depth: 0,
      };
      for (const command of strengthCommands(request.strength, request.legalCount))
        worker.postMessage(command);
      if (request.analysis)
        worker.postMessage(
          `setoption name MultiPV value ${Math.max(1, Math.min(3, Math.round(request.analysis.lines)))}`,
        );
      worker.postMessage(request.position);
      worker.postMessage(
        request.analysis?.depth
          ? `go depth ${Math.max(1, Math.min(20, Math.round(request.analysis.depth)))}`
          : request.strength.mode === 'training'
            ? 'go depth 2'
            : `go movetime ${Math.max(50, Math.min(3000, request.moveTime ?? 700))}`,
      );
    });
  }
}
