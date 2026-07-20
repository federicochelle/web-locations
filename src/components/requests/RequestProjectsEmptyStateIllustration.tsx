export function RequestProjectsEmptyStateIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 220"
      className="h-auto w-full max-w-[13rem] sm:max-w-[14rem]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="requests-empty-map-surface" x1="74" y1="42" x2="230" y2="176" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F4EFE7" />
          <stop offset="1" stopColor="#E9DDCC" />
        </linearGradient>
        <linearGradient id="requests-empty-map-accent" x1="0" y1="0" x2="30" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B7926D" />
          <stop offset="1" stopColor="#7C5E45" />
        </linearGradient>
      </defs>

      <ellipse cx="156" cy="194" rx="80" ry="10" fill="#0F0F10" fillOpacity="0.18" />

      <g transform="translate(42 22)">
        <rect
          x="18"
          y="18"
          width="196"
          height="152"
          rx="30"
          fill="#18181A"
          fillOpacity="0.94"
          stroke="#2A2623"
          strokeWidth="2"
        />

        <rect
          x="0"
          y="0"
          width="196"
          height="152"
          rx="30"
          fill="url(#requests-empty-map-surface)"
          stroke="#D7C4AD"
          strokeWidth="2"
        />

        <path
          d="M103.91 24C95.849 28.6143 92.0718 39.0113 85.7203 44.7251C81.3127 48.6894 73.6994 51.7928 70.5843 58.0201C66.8695 65.4462 68.2009 72.5116 64.9718 78.8075C61.4307 85.7118 53.4574 88.3188 49.5177 94.5337C45.4999 100.872 48.4668 108.443 50.5339 115.307C52.7697 122.731 51.0876 129.998 55.4875 136.319C60.4785 143.488 70.6339 146.767 79.4718 146.767C89.9645 146.767 98.853 142.758 106.589 136.718C112.456 132.136 115.42 125.285 120.393 120.116C126.315 113.963 135.143 110.418 139.583 102.887C144.527 94.5009 143.16 84.4715 140.639 75.2591C138.523 67.529 132.947 61.6766 130.102 54.2155C127.076 46.2787 128.317 36.667 122.959 30.0111C117.978 23.8232 110.978 19.9549 103.91 24Z"
          fill="#E5D6C1"
          stroke="#CCB292"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        <path
          d="M89 54C93 60 101 63 106 69C111 75 112 84 116 91"
          stroke="#D8C4AB"
          strokeWidth="3"
          strokeLinecap="round"
          strokeOpacity="0.95"
        />
        <path
          d="M80 92C87 96 96 98 104 104C109 108 112 114 115 121"
          stroke="#D8C4AB"
          strokeWidth="3"
          strokeLinecap="round"
          strokeOpacity="0.95"
        />

        <g transform="translate(77 46)">
          <path
            d="M0 20C0 8.9543 8.95431 0 20 0C31.0457 0 40 8.9543 40 20C40 34.3247 24.028 49.6418 21.2051 52.2213C20.5284 52.8395 19.4716 52.8395 18.7949 52.2213C15.972 49.6418 0 34.3247 0 20Z"
            fill="url(#requests-empty-map-accent)"
          />
          <circle cx="20" cy="20" r="7" fill="#FFF8EE" />
        </g>

        <g transform="translate(118 84)">
          <path
            d="M0 17C0 7.61116 7.61116 0 17 0C26.3888 0 34 7.61116 34 17C34 29.176 20.4238 42.1955 18.0252 44.3871C17.45 44.9123 16.55 44.9123 15.9748 44.3871C13.5762 42.1955 0 29.176 0 17Z"
            fill="#A98563"
          />
          <circle cx="17" cy="17" r="6" fill="#FFF8EE" />
        </g>

        <g transform="translate(52 102)">
          <path
            d="M0 15C0 6.71573 6.71573 0 15 0C23.2843 0 30 6.71573 30 15C30 25.7464 18.0204 37.2313 15.9031 39.1651C15.3956 39.6287 14.6044 39.6287 14.0969 39.1651C11.9796 37.2313 0 25.7464 0 15Z"
            fill="#8D6C50"
          />
          <circle cx="15" cy="15" r="5" fill="#FFF8EE" />
        </g>

        <path
          d="M28 128C44.3013 116.307 59.9031 110.46 74.8053 110.46C96.8831 110.46 109.707 123.807 129.384 123.807C145.021 123.807 159.56 117.297 173 104.278"
          stroke="#C4A37D"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="1 12"
          strokeOpacity="0.78"
        />
      </g>
    </svg>
  )
}
