import React from 'react';

const TeacherUiIcon = ({ name = 'info', size = 18, className = '' }) => {
  const paths = {
    book: <><path d="M5 3h13a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2ZM5 3v16M9 7h7M9 11h7M9 15h5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    swap: <><path d="M7 7h11l-3-3M17 17H6l3 3" /><path d="M18 7l-3 3M6 17l3-3" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    test: <><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h4" /><path d="m3 15 2 2 3-4" /></>,
    ai: <><rect x="4" y="7" width="16" height="13" rx="4" /><path d="M12 7V3M9 3h6M8 13h.01M16 13h.01M9 17h6" /></>,
    assignment: <><path d="M5 4h14v17H5zM9 4V2h6v2M9 10h6M9 14h6M9 18h4" /></>,
    chat: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    report: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
    coins: <><circle cx="9" cy="12" r="6" /><path d="M9 9v6M7 10h3a1.5 1.5 0 0 1 0 3H8M15 7a5 5 0 1 1 0 10" /></>,
    salary: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /><circle cx="17" cy="15" r="1" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    warning: <><path d="M12 3 2 21h20Z" /><path d="M12 9v5M12 17h.01" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    save: <><path d="M5 3h12l3 3v15H4V3Z" /><path d="M8 3v6h8V3M8 21v-7h8v7" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    camera: <><path d="M4 7h4l2-3h4l2 3h4v13H4Z" /><circle cx="12" cy="13" r="4" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M15 8l2 2M18 5l2 2" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    attach: <><path d="m21 11-8 8a6 6 0 0 1-8-8l9-9a4 4 0 0 1 6 6l-9 9a2 2 0 0 1-3-3l8-8" /></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />,
    lightbulb: <><path d="M9 18h6M10 22h4" /><path d="M8 14a7 7 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3Z" /></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 20" /></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V4H4v12h4" /></>
  };
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.info}</svg>;
};

export default TeacherUiIcon;
