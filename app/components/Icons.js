const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const make = (paths, viewBox = base.viewBox) =>
  function Icon({ size = 16, ...props }) {
    return (
      <svg {...base} viewBox={viewBox} width={size} height={size} {...props}>
        {paths}
      </svg>
    );
  };

export const IconCheck = make(<path d="m3.5 8.5 3 3 6-7" />);
export const IconX = make(<path d="m4 4 8 8M12 4l-8 8" />);
export const IconCopy = make(
  <>
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M10.5 5.5v-1a1.5 1.5 0 0 0-1.5-1.5H4.5A1.5 1.5 0 0 0 3 4.5V9a1.5 1.5 0 0 0 1.5 1.5h1" />
  </>
);
export const IconExternal = make(<path d="M9 3h4v4M13 3 7.5 8.5M12 9v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3" />);
export const IconChevron = make(<path d="m6 4 4 4-4 4" />);
export const IconSun = make(
  <>
    <circle cx="8" cy="8" r="2.75" />
    <path d="M8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9" />
  </>
);
export const IconMoon = make(<path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" />);
export const IconGithub = make(
  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />,
  "0 0 24 24"
);
export const IconUpload = make(<path d="M8 10.5V2.5M5 5.500l3-3 3 3M2.500 10.500v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" />);
export const IconFolder = make(<path d="M2 4.500A1.500 1.500 0 0 1 3.500 3h2.300l1.400 1.500h5.300A1.500 1.500 0 0 1 14 6v5.500a1.500 1.500 0 0 1-1.500 1.500h-9A1.500 1.500 0 0 1 2 11.500Z" />);
export const IconAlert = make(<path d="M8 2 1.500 13.500h13Zm0 4.500v3m0 2v.01" />);
export const IconInfo = make(
  <>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 7.500v3.500M8 5v.01" />
  </>
);
export const IconShield = make(<path d="M8 1.500 2.500 3.500v4c0 3.200 2.300 5.700 5.500 7 3.200-1.300 5.500-3.800 5.500-7v-4Z" />);
export const IconKey = make(
  <>
    <circle cx="5" cy="10.5" r="2.500" />
    <path d="m7 8.500 6-6M11 4.500l1.500 1.500M9.500 6l1.500 1.500" />
  </>
);
export const IconPlus = make(<path d="M8 3v10M3 8h10" />);
export const IconRefresh = make(<path d="M13 3v3.500H9.500M3 13V9.500h3.500M3.600 6.500A5 5 0 0 1 12.800 5.500L13 6.500M12.400 9.500a5 5 0 0 1-9.200 1L3 9.500" />);

export function Logo({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.500 1.500c.4 3-1.200 4.600-2.800 6.300C8.200 9.400 7 11 7 13.200c0 2.800 2.200 5 5 5s5-2.200 5-5c0-1.300-.5-2.300-1.100-3.200-.3 1.200-1 2-2 2.300.5-3.600-.1-7.600-1.400-9.800Z" />
      <path d="M12 22c-4 0-7-2.600-7-6.200 0-1.200.4-2.300 1-3.200.1 2 1.100 3.600 2.600 4.500C8.400 20 10 22 12 22Z" opacity=".55" />
      <path d="M12 22c4 0 7-2.600 7-6.200 0-1.200-.4-2.300-1-3.200-.1 2-1.100 3.600-2.600 4.500.2 2.900-1.400 4.900-3.400 4.900Z" opacity=".55" />
    </svg>
  );
}
