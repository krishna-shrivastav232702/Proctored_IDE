import React from "react";

export const HtmlLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M3 2L4.5 20L12 22L19.5 20L21 2H3Z" fill="#e44d26" />
    <path d="M12 3V21L18.5 19.5L19.5 3H12Z" fill="#f16529" />
    <path
      d="M12 7H16L15.5 13L12 14L8.5 13L8.25 10.5H10.25L10.375 11.5L12 12L13.625 11.5L13.75 9.5H8V7.5H12V7Z"
      fill="white"
    />
    <path
      d="M12 15.5L8.5 16.5L8.25 19H10.25L10.375 17.5L12 17V15.5Z"
      fill="white"
    />
  </svg>
);

export const ReactLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g stroke="#61dafb" strokeWidth="2" fill="none">
      <ellipse cx="12" cy="12" rx="9" ry="3.5" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(120 12 12)" />
    </g>
    <circle cx="12" cy="12" r="2" fill="#61dafb" />
  </svg>
);

export const NextLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="10" fill="black" />
    <path d="M8 8H16V16L8 8Z" fill="white" />
    <path d="M16 8L8 16V8H16Z" fill="url(#gradient)" />
    <defs>
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="white" />
        <stop offset="100%" stopColor="transparent" />
      </linearGradient>
    </defs>
  </svg>
);

export const VueLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 3L9 8H15L12 3Z" fill="#4fc08d" />
    <path d="M15 8L12 14L9 8H6L12 20L18 8H15Z" fill="#35495e" />
    <path d="M9 8L12 14L15 8H12H9Z" fill="#4fc08d" />
  </svg>
);

export const PythonLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2C14.5 2 16.5 3.5 16.5 5.5V8.5C16.5 10.5 14.5 12 12 12H7.5C5.5 12 4 13.5 4 15.5V18.5C4 20.5 6 22 8.5 22H15.5C18 22 20 20.5 20 18.5V15.5C20 13.5 18 12 15.5 12H12V11H16.5V5.5C16.5 2.5 14.5 1 12 1H5.5C3 1 1 2.5 1 5.5V8.5C1 10.5 3 12 5.5 12H8V13H3.5V18.5C3.5 21.5 5.5 23 8 23H12C9.5 23 7.5 21.5 7.5 18.5V15.5C7.5 13.5 9.5 12 12 12Z"
      fill="url(#pythonGradient)"
    />
    <circle cx="9" cy="6.5" r="1.5" fill="white" />
    <circle cx="15" cy="17.5" r="1.5" fill="white" />
    <defs>
      <linearGradient id="pythonGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#3776ab" />
        <stop offset="100%" stopColor="#ffd43b" />
      </linearGradient>
    </defs>
  </svg>
);

export const AngularLogo: React.FC<{ className?: string }> = ({
  className,
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2L3 6L4.5 18L12 22L19.5 18L21 6L12 2Z" fill="#dd0031" />
    <path d="M12 2V22L19.5 18L21 6L12 2Z" fill="#c3002f" />
    <path d="M12 4.5L16.5 16H14L13 13.5H11L10 16H7.5L12 4.5Z" fill="white" />
    <path d="M12 7.5L11 10.5H13L12 7.5Z" fill="white" />
  </svg>
);
