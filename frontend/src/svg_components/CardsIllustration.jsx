import React from 'react';

// MODIFIED: The component now accepts props, including className.
export default function CardIllustration({ className, ...props }) {
  return (
    <svg 
      // MODIFIED: width and height are removed to allow CSS to control the size.
      // The viewBox attribute is kept, which is essential for scaling.
      viewBox="0 0 294 154" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      // MODIFIED: The className and any other props are now applied to the SVG tag.
      className={className}
      {...props}
    >
      <defs>
        <style>
          {`
            .theme-aware-bg {
              fill: white;
            }
            .dark .theme-aware-bg {
              fill: oklch(0.2686 0 0);
            }
            /* --- Border / Stroke --- */
            .theme-border {
              stroke: #DDDDDD;
            }
            .dark .theme-border {
              stroke: hsl(215 20.2% 65.1% / 0.2);
            }
            .theme-accent-purple-bg {
              fill: #F3E8F3;
            }
            .dark .theme-accent-purple-bg {
              fill: #605860;
            }
            .theme-accent-green-bg {
              fill: #E6F7F2;
            }
            .dark .theme-accent-green-bg {
              fill: #5E6A67;
            }
          `}
        </style>
        <filter id="filter0_d_3489_16255" x="0.269287" y="0.597656" width="226.711" height="105.168" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="12"/>
          <feGaussianBlur stdDeviation="10"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_3489_16255"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_3489_16255" result="shape"/>
        </filter>
        <filter id="filter1_d_3489_16255" x="37.0901" y="31.7383" width="256.397" height="121.867" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="12"/>
          <feGaussianBlur stdDeviation="10"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_3489_16255"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_3489_16255" result="shape"/>
        </filter>
      </defs>

      <g filter="url(#filter0_d_3489_16255)">
        <rect x="23.6973" y="8.32812" width="184" height="53" rx="4" transform="rotate(4 23.6973 8.32812)" className="theme-aware-bg"/>
        <rect x="24.1612" y="8.86179" width="183" height="52" rx="3.5" transform="rotate(4 24.1612 8.86179)" className="theme-border"/>
      </g>
      <rect x="34.625" y="20.9062" width="29" height="29" transform="rotate(4 34.625 20.9062)" fill="#881E87" fillOpacity="0.1"/>
      <rect x="75.7119" y="23.2734" width="60" height="14" rx="7" transform="rotate(4 75.7119 23.2734)" className="theme-accent-purple-bg"/>
      <rect x="74.4033" y="42.8672" width="82.432" height="8.83333" rx="4.41667" transform="rotate(4 74.4033 42.8672)" className="theme-accent-purple-bg"/>
      
      <path d="M55.7191 42.8812L40.1352 41.5649L48.8998 30.7085L55.7191 42.8812Z" className="theme-aware-bg" stroke="#881E87" strokeWidth="2"/>

      <g filter="url(#filter1_d_3489_16255)">
        <rect x="56.6973" y="61.3281" width="212" height="61" rx="4" transform="rotate(-5.95192 56.6973 61.3281)" className="theme-aware-bg"/>
        <rect x="57.2464" y="61.7736" width="211" height="60" rx="3.5" transform="rotate(-5.95192 57.2464 61.7736)" className="theme-border"/>
      </g>
      <rect x="71.5986" y="73.3984" width="34" height="34" transform="rotate(-5.95192 71.5986 73.3984)" fill="#01B27C" fillOpacity="0.1"/>
      <rect x="118.741" y="67.6406" width="108" height="16" rx="8" transform="rotate(-5.95192 118.741 67.6406)" className="theme-accent-green-bg"/>
      <rect x="121.113" y="90.3984" width="71" height="10" rx="5" transform="rotate(-5.95192 121.113 90.3984)" className="theme-accent-green-bg"/>

      <path d="M89.1914 80.1917C94.1332 79.6725 98.5613 83.2585 99.0808 88.202C99.6003 93.1455 96.0145 97.5737 91.0727 98.0932C86.1308 98.6125 81.7028 95.0264 81.1833 90.0829C80.6637 85.1394 84.2494 80.7111 89.1914 80.1917Z" className="theme-aware-bg" stroke="#0097AC" strokeWidth="2"/>
    </svg>
  );
}