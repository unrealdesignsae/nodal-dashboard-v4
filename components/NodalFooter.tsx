'use client';

export function NodalFooter() {
  return (
    <footer className="nodal-footer">
      <div className="nodal-footer-inner">

        {/* Brand */}
        <div className="nodal-footer-brand">
          <img
            src="/brand/nodal-logo-mark.png"
            alt="Nodal TC"
            className="nodal-footer-logo"
          />
          <div className="nodal-footer-company">
            NODAL TECHNICAL CONSULTANCY
          </div>
          <div className="nodal-footer-sub">
            FZ-LLC · Dubai, UAE · Global Delivery
          </div>
          <div className="nodal-footer-tagline">
            Precision Event Engineering
          </div>
        </div>

        {/* Contact */}
        <div className="nodal-footer-col">
          <div className="nodal-footer-col-label">CONTACT</div>
          <a href="mailto:info@nodaltc.com" className="nodal-footer-link">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span>info@nodaltc.com</span>
          </a>
          <a href="tel:+971501234567" className="nodal-footer-link">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.0 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.28-1.28a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
            <span>+971 50 123 4567</span>
          </a>
          <div className="nodal-footer-link">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
            <span>Dubai, UAE</span>
          </div>
        </div>

        {/* Links */}
        <div className="nodal-footer-col">
          <div className="nodal-footer-col-label">LINKS</div>
          {[
            { label: 'nodaltc.com', href: 'https://nodaltc.com' },
            { label: 'nodaltech.ae', href: 'https://nodaltech.ae' },
            { label: '@nodaltech', href: 'https://twitter.com/nodaltech' },
          ].map(({ label, href }) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" className="nodal-footer-link">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
              <span>{label}</span>
            </a>
          ))}
        </div>

        {/* Accepting briefs */}
        <div className="nodal-footer-cta">
          <div className="nodal-footer-brief-badge">
            ACCEPTING BRIEFS 2026 – 2027
          </div>
          <a href="https://nodaltc.com/#contact" target="_blank" rel="noreferrer" className="nodal-footer-cta-link">
            Start a conversation →
          </a>
          <div className="nodal-footer-meta">
            EC26 · MAINSTAGE ADVANCING · INTERNAL
          </div>
        </div>

      </div>
    </footer>
  );
}
