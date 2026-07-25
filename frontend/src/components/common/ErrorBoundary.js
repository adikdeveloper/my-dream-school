import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Production: log to error tracking service (e.g., Sentry)
    // console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Optionally reload the page
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.icon}>⚠️</div>
            <h2 style={styles.title}>Nimadir noto'g'ri ketdi</h2>
            <p style={styles.message}>
              Kechirasiz, sahifani ko'rsatishda xatolik yuz berdi.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Texnik ma'lumot</summary>
                <pre style={styles.pre}>
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <button onClick={this.handleReset} style={styles.button}>
              Qayta urinish
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#f8fafc',
    padding: '2rem'
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '3rem',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
    maxWidth: '600px',
    textAlign: 'center'
  },
  icon: {
    fontSize: '4rem',
    marginBottom: '1.5rem'
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 1rem 0'
  },
  message: {
    fontSize: '1rem',
    color: '#64748b',
    margin: '0 0 1.5rem 0',
    lineHeight: '1.6'
  },
  details: {
    textAlign: 'left',
    marginBottom: '1.5rem',
    padding: '1rem',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  summary: {
    cursor: 'pointer',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem'
  },
  pre: {
    fontSize: '0.75rem',
    color: '#64748b',
    overflow: 'auto',
    margin: '0.5rem 0 0 0',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word'
  },
  button: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    padding: '0.875rem 2rem',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.3s ease'
  }
};

export default ErrorBoundary;
