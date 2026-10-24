import { Component, type ReactNode } from 'react';
export class AppBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="app-recovery">
        <h1>Не удалось открыть приложение</h1>
        <p>Перезагрузите страницу. Сохранённая партия останется в этом браузере.</p>
        <button className="primary" onClick={() => location.reload()}>
          Перезагрузить
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
