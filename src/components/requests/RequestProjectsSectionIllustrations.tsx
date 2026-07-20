type RequestProjectsSectionIllustrationProps = {
  variant: 'drafts' | 'submitted'
}

export function RequestProjectsSectionIllustration({
  variant,
}: RequestProjectsSectionIllustrationProps) {
  if (variant === 'drafts') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 320 220"
        className="h-auto w-full max-w-[26rem] drop-shadow-[0_20px_44px_rgba(0,0,0,0.24)] sm:max-w-[28rem]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="drafts-shell" x1="48" y1="48" x2="260" y2="186" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5F1EA" />
            <stop offset="1" stopColor="#E7D7C3" />
          </linearGradient>
          <linearGradient id="drafts-card" x1="154" y1="68" x2="244" y2="156" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFDF9" />
            <stop offset="1" stopColor="#F0E6D8" />
          </linearGradient>
          <linearGradient id="drafts-note" x1="0" y1="0" x2="92" y2="78" gradientUnits="userSpaceOnUse">
            <stop stopColor="#B08B67" />
            <stop offset="1" stopColor="#7A5A42" />
          </linearGradient>
        </defs>

        <ellipse cx="158" cy="196" rx="84" ry="12" fill="#0F0F10" fillOpacity="0.3" />

        <g transform="translate(38 28)">
          <rect
            x="0"
            y="18"
            width="244"
            height="154"
            rx="28"
            fill="url(#drafts-shell)"
            stroke="#D7C0A2"
            strokeWidth="2"
          />
          <rect x="18" y="44" width="208" height="104" rx="24" fill="#161618" fillOpacity="0.95" />

          <g transform="translate(24 98) rotate(-8 52 36)">
            <rect x="0" y="0" width="104" height="72" rx="16" fill="#FFFDF9" stroke="#DBC6A7" strokeWidth="2" />
            <rect x="12" y="12" width="80" height="28" rx="10" fill="#D5B28A" />
            <rect x="12" y="50" width="56" height="8" rx="4" fill="#E8DCCA" />
          </g>

          <g transform="translate(132 54)">
            <rect
              x="0"
              y="0"
              width="88"
              height="88"
              rx="20"
              fill="url(#drafts-card)"
              stroke="#E2D2BD"
              strokeWidth="2"
            />
            <rect x="16" y="18" width="56" height="10" rx="5" fill="#CFB28C" fillOpacity="0.8" />
            <rect x="16" y="36" width="42" height="10" rx="5" fill="#CFB28C" fillOpacity="0.46" />
            <rect x="16" y="58" width="52" height="12" rx="6" fill="#E6DAC8" />
          </g>

          <g transform="translate(34 0)">
            <rect
              x="0"
              y="0"
              width="92"
              height="64"
              rx="18"
              fill="url(#drafts-note)"
            />
            <path d="M18 18H74" stroke="#F8F1E7" strokeWidth="8" strokeLinecap="round" />
            <path d="M18 34H60" stroke="#F8F1E7" strokeWidth="8" strokeLinecap="round" />
            <path d="M18 50H48" stroke="#F8F1E7" strokeWidth="8" strokeLinecap="round" />
          </g>

          <g transform="translate(188 104)">
            <circle cx="22" cy="22" r="22" fill="#9B7858" />
            <path d="M14 22H30" stroke="#FFFDF9" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M22 14V30" stroke="#FFFDF9" strokeWidth="4.5" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 220"
      className="h-auto w-full max-w-[26rem] drop-shadow-[0_20px_44px_rgba(0,0,0,0.24)] sm:max-w-[28rem]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="submitted-shell" x1="52" y1="44" x2="258" y2="188" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5F1EA" />
          <stop offset="1" stopColor="#E7D7C3" />
        </linearGradient>
        <linearGradient id="submitted-card" x1="126" y1="58" x2="230" y2="152" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFDF9" />
          <stop offset="1" stopColor="#F2E8DA" />
        </linearGradient>
        <linearGradient id="submitted-plane" x1="0" y1="0" x2="104" y2="96" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B08B67" />
          <stop offset="1" stopColor="#765741" />
        </linearGradient>
      </defs>

      <ellipse cx="160" cy="196" rx="84" ry="12" fill="#0F0F10" fillOpacity="0.3" />

      <g transform="translate(40 28)">
        <rect
          x="0"
          y="18"
          width="240"
          height="154"
          rx="28"
          fill="url(#submitted-shell)"
          stroke="#D7C0A2"
          strokeWidth="2"
        />
        <rect x="20" y="44" width="200" height="104" rx="24" fill="#161618" fillOpacity="0.95" />

        <g transform="translate(44 0)">
          <rect
            x="0"
            y="0"
            width="82"
            height="62"
            rx="18"
            fill="#A88461"
          />
          <path d="M18 0L0 24" stroke="#F7EFE4" strokeWidth="8" />
          <path d="M48 0L26 30" stroke="#F7EFE4" strokeWidth="8" />
          <path d="M82 10L56 42" stroke="#F7EFE4" strokeWidth="8" />
        </g>

        <g transform="translate(94 56)">
          <rect
            x="0"
            y="0"
            width="102"
            height="84"
            rx="20"
            fill="url(#submitted-card)"
            stroke="#E0CDB4"
            strokeWidth="2"
          />
          <rect x="16" y="18" width="70" height="12" rx="6" fill="#CCB08A" fillOpacity="0.72" />
          <rect x="16" y="40" width="54" height="12" rx="6" fill="#CCB08A" fillOpacity="0.46" />
          <rect x="16" y="62" width="42" height="10" rx="5" fill="#E5D8C6" />
        </g>

        <g transform="translate(18 102) rotate(-7 46 32)">
          <rect x="0" y="0" width="92" height="64" rx="16" fill="#FFFDF9" stroke="#DBC6A7" strokeWidth="2" />
          <rect x="12" y="12" width="68" height="24" rx="10" fill="#D1B38E" />
          <path d="M12 46H62" stroke="#E1D2BE" strokeWidth="8" strokeLinecap="round" />
        </g>

        <g transform="translate(156 84)">
          <path
            d="M8 58C28 56 42 46 56 30"
            stroke="#D8C1A4"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="10 12"
            strokeOpacity="0.9"
          />
          <path
            d="M48 20L98 0C100.908 -1.16328 104 1.35419 103.245 4.43062L89.758 59.3856C88.979 62.5589 85.06 63.3218 83.2063 60.6374L69.4015 40.6448C68.7963 39.7686 67.8612 39.1778 66.8114 39.0054L44.1763 35.2897C41.1375 34.7908 40.504 30.7271 43.0411 29.3355L48 20Z"
            fill="url(#submitted-plane)"
          />
          <path
            d="M47 20L69 40.5"
            stroke="#FFF8EE"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M69 40.5L89.5 59"
            stroke="#FFF8EE"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.92"
          />
          <path
            d="M58 31L93 6"
            stroke="#F2E4D2"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeOpacity="0.84"
          />
          <circle cx="24" cy="56" r="4" fill="#F6ECDF" fillOpacity="0.76" />
        </g>
      </g>
    </svg>
  )
}
