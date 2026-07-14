export function RequestsEmptyStateIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 640 420"
      className="h-auto w-full max-w-[30rem] drop-shadow-[0_28px_70px_rgba(0,0,0,0.28)] sm:max-w-[34rem] lg:max-w-[38rem]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="requests-empty-panel" x1="128" y1="76" x2="503" y2="348" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5F1EA" />
          <stop offset="1" stopColor="#E7D7C3" />
        </linearGradient>
        <linearGradient id="requests-empty-board" x1="212" y1="96" x2="461" y2="312" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFDF9" />
          <stop offset="1" stopColor="#F0E6D8" />
        </linearGradient>
        <linearGradient id="requests-empty-clapper" x1="0" y1="0" x2="124" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A88461" />
          <stop offset="1" stopColor="#6E503A" />
        </linearGradient>
      </defs>

      <ellipse cx="321" cy="372" rx="182" ry="24" fill="#0F0F10" fillOpacity="0.34" />

      <g transform="translate(136 76)">
        <rect
          x="0"
          y="32"
          width="368"
          height="236"
          rx="30"
          fill="url(#requests-empty-panel)"
          stroke="#D7C0A2"
          strokeWidth="2"
        />
        <path
          d="M26 88C26 74.7452 36.7452 64 50 64H318C331.255 64 342 74.7452 342 88V220C342 233.255 331.255 244 318 244H50C36.7452 244 26 233.255 26 220V88Z"
          fill="#171719"
          fillOpacity="0.94"
        />

        <g transform="translate(52 0)">
          <rect
            x="0"
            y="0"
            width="124"
            height="88"
            rx="18"
            fill="url(#requests-empty-clapper)"
          />
          <path d="M25 0L0 31" stroke="#F7EFE4" strokeWidth="10" />
          <path d="M69 0L33 44" stroke="#F7EFE4" strokeWidth="10" />
          <path d="M113 0L77 44" stroke="#F7EFE4" strokeWidth="10" />
          <path d="M124 18L98 50" stroke="#F7EFE4" strokeWidth="10" />
          <rect x="18" y="52" width="88" height="15" rx="7.5" fill="#201712" fillOpacity="0.18" />
        </g>

        <g transform="translate(156 56)">
          <rect
            x="0"
            y="0"
            width="210"
            height="170"
            rx="24"
            fill="url(#requests-empty-board)"
            stroke="#E3D3BE"
            strokeWidth="2"
          />
          <rect x="24" y="30" width="80" height="54" rx="14" fill="#D8BE9B" />
          <rect x="118" y="30" width="68" height="12" rx="6" fill="#CCB08A" fillOpacity="0.72" />
          <rect x="118" y="50" width="52" height="12" rx="6" fill="#CCB08A" fillOpacity="0.46" />
          <rect x="24" y="102" width="162" height="16" rx="8" fill="#E3D3BE" />
          <rect x="24" y="130" width="116" height="12" rx="6" fill="#E7DACA" />
        </g>

        <g transform="translate(12 150) rotate(-8 86 60)">
          <rect x="0" y="0" width="128" height="88" rx="18" fill="#F8F4EC" stroke="#DCC7AA" strokeWidth="2" />
          <rect x="14" y="14" width="100" height="36" rx="12" fill="#D1B38E" />
          <path d="M14 62H114" stroke="#E1D2BE" strokeWidth="10" strokeLinecap="round" />
        </g>

        <g transform="translate(272 168) rotate(7 66 48)">
          <rect x="0" y="0" width="132" height="96" rx="20" fill="#FFFDF9" stroke="#DCC7AA" strokeWidth="2" />
          <rect x="16" y="16" width="100" height="40" rx="12" fill="#C4A37D" fillOpacity="0.9" />
          <rect x="16" y="68" width="70" height="12" rx="6" fill="#E1D0BC" />
        </g>

        <g transform="translate(298 132)">
          <path
            d="M38 0C17.0132 0 0 17.0132 0 38C0 65.2222 30.2778 93.6296 35.6296 98.4259C37.0119 99.6645 38.9881 99.6645 40.3704 98.4259C45.7222 93.6296 76 65.2222 76 38C76 17.0132 58.9868 0 38 0Z"
            fill="#9B7858"
          />
          <circle cx="38" cy="38" r="13" fill="#FFFDF9" />
          <circle cx="38" cy="38" r="6" fill="#D7C0A2" />
        </g>

        <circle cx="62" cy="118" r="8" fill="#D7C0A2" fillOpacity="0.72" />
        <circle cx="334" cy="72" r="6" fill="#F5EBDD" fillOpacity="0.84" />
        <circle cx="346" cy="122" r="4" fill="#D1B38E" fillOpacity="0.68" />
      </g>
    </svg>
  )
}
