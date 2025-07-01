// src/components/icons/empty-state-icon.jsx
import React from 'react';

const NoFile = ({ className, ...props }) => {
  return (
    <svg
      width="119"
      height="118"
      viewBox="0 0 119 118"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Background Circle */}
      <path
        d="M59.5001 118C92.0849 118 118.5 91.5848 118.5 59C118.5 26.4152 92.0849 0 59.5001 0C26.9153 0 0.500122 26.4152 0.500122 59C0.500122 91.5848 26.9153 118 59.5001 118Z"
        // Original: #F2F6FC -> Mapped to slate-100
        className="fill-slate-100 dark:fill-[#1f1f1f]"
      />
      {/* Paper Shape */}
      <path
        d="M24.0997 117.999H94.8997V41.6921C93.2464 41.6958 91.6088 41.3715 90.0817 40.7379C88.5547 40.1043 87.1684 39.1741 86.0033 38.0011C84.8307 36.8359 83.9007 35.4498 83.2673 33.9228C82.6339 32.3959 82.3095 30.7586 82.3131 29.1055H24.0997V117.999Z"
        // Original: white
        className="fill-white dark:fill-[#171717]"
      />
      {/* Inner Circle for X */}
      <path
        d="M59.4999 80.2405C69.927 80.2405 78.3799 71.7876 78.3799 61.3605C78.3799 50.9333 69.927 42.4805 59.4999 42.4805C49.0727 42.4805 40.6199 50.9333 40.6199 61.3605C40.6199 71.7876 49.0727 80.2405 59.4999 80.2405Z"
        // Original: #F2F6FC -> Mapped to slate-100
        className="fill-slate-100 dark:fill-[#1f1f1f]"
      />
      {/* The 'X' Mark */}
      <path
        d="M66.1747 70.2605L59.4996 63.5854L52.8245 70.2605L50.5995 68.0354L57.2746 61.3604L50.5995 54.6853L52.8245 52.4602L59.4996 59.1353L66.1747 52.4602L68.3997 54.6853L61.7247 61.3604L68.3998 68.0354L66.1747 70.2605Z"
        // Original: #178AE0 -> Mapped to blue-500 (a standard Tailwind primary blue)
        className="fill-blue-500 dark:fill-blue-900"
      />
      {/* Text Placeholder Line 1 */}
      <path
        d="M69.8847 88.4531H49.4314C48.128 88.4531 47.0714 89.5097 47.0714 90.8131C47.0714 92.1165 48.128 93.1731 49.4314 93.1731H69.8847C71.1881 93.1731 72.2447 92.1165 72.2447 90.8131C72.2447 89.5097 71.1881 88.4531 69.8847 88.4531Z"
        // Original: #E7EEEF -> Mapped to slate-200
        className="fill-slate-100 dark:fill-[#1f1f1f]"
      />
      {/* Text Placeholder Line 2 */}
      <path
        d="M76.9645 97.8945H42.3512C41.0478 97.8945 39.9912 98.9511 39.9912 100.255C39.9912 101.558 41.0478 102.615 42.3512 102.615H76.9645C78.2679 102.615 79.3245 101.558 79.3245 100.255C79.3245 98.9511 78.2679 97.8945 76.9645 97.8945Z"
        // Original: #E7EEEF -> Mapped to slate-200
        className="fill-slate-100 dark:fill-[#1f1f1f]"
      />
    </svg>
  );
};

export default NoFile;