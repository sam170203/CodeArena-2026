import useToastStore from '../store/toastStore';

const typeStyles = {
  success: { background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.4)', glow: 'rgba(52, 211, 153, 0.15)' },
  error: { background: 'rgba(248, 113, 113, 0.15)', border: '1px solid rgba(248, 113, 113, 0.4)', glow: 'rgba(248, 113, 113, 0.15)' },
  info: { background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.4)', glow: 'rgba(99, 102, 241, 0.15)' },
};

const icons = {
  success: '✓',
  error: '✕',
  info: 'i',
};

export default function Toast() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'grid', gap: 10 }}>
      {toasts.map((toast) => {
        const ts = typeStyles[toast.type] || typeStyles.info;
        return (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            style={{
              padding: '14px 20px',
              borderRadius: 14,
              background: ts.background,
              border: ts.border,
              backdropFilter: 'blur(20px)',
              boxShadow: `0 0 30px ${ts.glow}`,
              color: 'white',
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              minWidth: 240,
              maxWidth: 400,
              animation: 'toastIn 0.3s ease-out',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <span style={{
              width: 22, height: 22, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0,
              background: ts.border ? 'rgba(255,255,255,0.1)' : 'transparent',
            }}>
              {icons[toast.type] || ''}
            </span>
            {toast.message}
          </div>
        );
      })}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
