import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message?: string };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('渲染错误:', message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h1>页面加载出现问题</h1>
          <p>{this.state.message || '未知错误'}</p>
          <button onClick={() => this.setState({ hasError: false, message: undefined })}>
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
