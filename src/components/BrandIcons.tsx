import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

// Lucide no trae balón de fútbol; este sigue su misma grilla de 24px y trazo.
export function SoccerBallIcon({ size = 24, strokeWidth = 2, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7.6l4.2 3-1.6 4.9H9.4l-1.6-4.9z" fill="currentColor" fillOpacity="0.25" />
      <path d="M12 7.6V2.3M16.2 10.6l5-1.6M14.6 15.5l3 4.2M9.4 15.5l-3 4.2M7.8 10.6l-5-1.6" />
    </svg>
  )
}

// Los colores salen de los tokens (ver .logo en App.css) para que el escudo siga al tema claro u oscuro.
export function SportManagerLogo({ size = 44 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        className="logo__shield"
        d="M24 3.5 40.5 9v13.2c0 10.4-6.9 18.6-16.5 22.3C14.4 40.8 7.5 32.6 7.5 22.2V9z"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path className="logo__star" d="m16.5 10.5.7 1.4 1.5.2-1.1 1 .3 1.5-1.4-.7-1.4.7.3-1.5-1.1-1 1.5-.2z" />
      <path className="logo__star" d="m24 8 .7 1.4 1.5.2-1.1 1 .3 1.5L24 11.4l-1.4.7.3-1.5-1.1-1 1.5-.2z" />
      <path className="logo__star" d="m31.5 10.5.7 1.4 1.5.2-1.1 1 .3 1.5-1.4-.7-1.4.7.3-1.5-1.1-1 1.5-.2z" />
      <circle className="logo__ball" cx="24" cy="26" r="9" strokeWidth="2" />
      <path className="logo__patch" d="m24 22 3.6 2.6-1.4 4.2h-4.4l-1.4-4.2z" />
      <path
        className="logo__seams"
        d="M24 22v-5M27.6 24.6l4.6-1.4M26.2 28.8l2.8 3.8M21.8 28.8 19 32.6M20.4 24.6l-4.6-1.4"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
