/**
 * OPP brand logo; appearance follows dark/light theme.
 * Uses <img> plus CSS filter in dark mode (logo asset contains C2PA metadata that breaks SVGR inline import).
 */

const wrapperStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const logoSrc = `${import.meta.env.BASE_URL}opp-logo.svg`;

export function OppLogo({ size = 32, alt = '' }: { size?: number; alt?: string }) {
  return (
    <span
      className="opp-logo-wrap"
      style={{
        ...wrapperStyle,
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
      }}
      aria-hidden={!alt}
    >
      <img
        src={logoSrc}
        alt={alt}
        width={size}
        height={size}
        className="opp-logo-img"
        style={{
          display: 'block',
          width: size,
          height: size,
          objectFit: 'contain',
        }}
      />
    </span>
  );
}
