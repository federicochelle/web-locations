export function FavoritesEmptyStateIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 640 420"
      className="h-auto w-full max-w-[30rem] drop-shadow-[0_28px_70px_rgba(0,0,0,0.28)] sm:max-w-[34rem] lg:max-w-[38rem]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="favorites-empty-frame" x1="128" y1="88" x2="492" y2="340" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5F1EA" />
          <stop offset="1" stopColor="#E8D8C3" />
        </linearGradient>
        <linearGradient id="favorites-empty-heart" x1="0" y1="0" x2="118" y2="114" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B5906C" />
          <stop offset="1" stopColor="#7E5C44" />
        </linearGradient>
        <linearGradient id="favorites-empty-card" x1="220" y1="102" x2="430" y2="278" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFDF9" />
          <stop offset="1" stopColor="#F3E9DB" />
        </linearGradient>
      </defs>

      <ellipse cx="320" cy="372" rx="176" ry="24" fill="#0F0F10" fillOpacity="0.34" />

      <g transform="translate(138 76)">
        <rect
          x="0"
          y="26"
          width="364"
          height="242"
          rx="34"
          fill="url(#favorites-empty-frame)"
          stroke="#D7C0A2"
          strokeWidth="2"
        />

        <rect x="26" y="58" width="312" height="174" rx="28" fill="#151516" fillOpacity="0.95" />

        <g transform="translate(40 136) rotate(-8 60 52)">
          <rect x="0" y="0" width="120" height="104" rx="22" fill="#FFFDF9" stroke="#DBC6A7" strokeWidth="2" />
          <rect x="14" y="14" width="92" height="42" rx="14" fill="#D5B28A" />
          <rect x="14" y="68" width="74" height="12" rx="6" fill="#E6D8C5" />
          <rect x="14" y="86" width="52" height="8" rx="4" fill="#EDE2D3" />
        </g>

        <g transform="translate(154 40)">
          <path
            d="M62.1458 108.507C58.5342 111.77 53.0144 111.77 49.4028 108.507C20.9804 82.8253 2 64.8547 2 38.7721C2 20.7234 15.9274 7 33.5014 7C43.5665 7 53.235 11.8675 59.7743 19.4982C66.3135 11.8675 75.9821 7 86.0471 7C103.621 7 117.549 20.7234 117.549 38.7721C117.549 64.8547 98.5682 82.8253 70.1458 108.507H62.1458Z"
            fill="url(#favorites-empty-heart)"
          />
          <path
            d="M59.7744 28.5C59.7744 28.5 68.9957 17 83.1694 17C95.4139 17 105.549 26.7249 105.549 39.1099C105.549 58.2512 91.9276 72.4488 66.4902 95.5"
            stroke="#F8F1E7"
            strokeWidth="8"
            strokeLinecap="round"
          />
        </g>

        <g transform="translate(214 144)">
          <rect
            x="0"
            y="0"
            width="132"
            height="98"
            rx="22"
            fill="url(#favorites-empty-card)"
            stroke="#E0CDB4"
            strokeWidth="2"
          />
          <rect x="18" y="18" width="96" height="40" rx="14" fill="#CAB08D" />
          <rect x="18" y="70" width="68" height="12" rx="6" fill="#E4D5C1" />
        </g>

        <g transform="translate(278 88)">
          <path
            d="M34 0C15.2223 0 0 15.2223 0 34C0 58.3553 27.0789 83.7789 31.8647 88.0724C33.1001 89.1799 34.8999 89.1799 36.1353 88.0724C40.9211 83.7789 68 58.3553 68 34C68 15.2223 52.7777 0 34 0Z"
            fill="#9B7858"
          />
          <circle cx="34" cy="34" r="12" fill="#FFFDF9" />
          <path d="M28 34L32 38L40 30" stroke="#9B7858" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        <circle cx="64" cy="104" r="7" fill="#DCC6A7" fillOpacity="0.72" />
        <circle cx="314" cy="82" r="5" fill="#F6ECDF" fillOpacity="0.84" />
        <circle cx="330" cy="126" r="4" fill="#CFAE88" fillOpacity="0.74" />
      </g>
    </svg>
  )
}
