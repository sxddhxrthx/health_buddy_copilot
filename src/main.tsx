import React from 'react';
import ReactDOM from 'react-dom/client';
import Session from './Session';
import './styles.css';

class ErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="startup">
          <h1>Research Twin</h1>
          <p>The workspace could not be displayed. Reload to start a clean synthetic session.</p>
          <button onClick={() => location.reload()}>Reload workspace</button>
        </main>
      );
    return this.props.children;
  }
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Session />
    </ErrorBoundary>
  </React.StrictMode>,
);
