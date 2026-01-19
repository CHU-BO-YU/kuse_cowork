import { Component, mergeProps } from "solid-js";

export type IconName =
    | "file"
    | "search"
    | "command"
    | "docker"
    | "folder"
    | "plus"
    | "close"
    | "chat"
    | "agent"
    | "settings"
    | "skills"
    | "server"
    | "delete"
    | "dashboard"
    | "send"
    | "menu"
    | "cloud"
    | "ollama"
    | "home";

interface IconProps {
    name: IconName;
    size?: number;
    class?: string;
    strokeWidth?: number;
}

const Icon: Component<IconProps> = (props) => {
    const merged = mergeProps({ size: 24, strokeWidth: 2, class: "" }, props);

    const paths: Record<IconName, any> = {
        file: (
            <>
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
            </>
        ),
        search: (
            <>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </>
        ),
        command: (
            <polyline points="4 17 10 11 4 5" />
        ),
        docker: (
            <>
                <rect x="2" y="10" width="3" height="3" />
                <rect x="6" y="10" width="3" height="3" />
                <rect x="10" y="10" width="3" height="3" />
                <rect x="2" y="6" width="3" height="3" />
                <rect x="6" y="6" width="3" height="3" />
                <rect x="10" y="6" width="3" height="3" />
                <rect x="14" y="6" width="3" height="3" />
                <rect x="2" y="2" width="3" height="3" />
                <rect x="6" y="2" width="3" height="3" />
                <path d="M19.5 8H21a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-5" />
            </>
        ),
        folder: (
            <>
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </>
        ),
        plus: (
            <>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
            </>
        ),
        close: (
            <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
            </>
        ),
        chat: (
            <>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </>
        ),
        agent: (
            <>
                <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                <path d="M4 11v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
                <path d="M4 11h16" />
                <path d="M8 11v6" />
                <path d="M16 11v6" />
            </>
        ),
        settings: (
            <>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </>
        ),
        skills: (
            <>
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </>
        ),
        server: (
            <>
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
            </>
        ),
        delete: (
            <>
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </>
        ),
        dashboard: (
            <>
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
            </>
        ),
        send: (
            <>
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </>
        ),
        menu: (
            <>
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
            </>
        ),
        cloud: (
            <>
                <path d="M17.5 19c0-3.037-2.463-5.5-5.5-5.5S6.5 15.963 6.5 19" />
                <path d="M19 19H5" />
            </>
        ),
        ollama: (
            <>
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
                <path d="M12 7v10" />
                <path d="M8 12h8" />
            </>
        ),
        home: (
            <>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
            </>
        )
    };

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={merged.size}
            height={merged.size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width={merged.strokeWidth}
            stroke-linecap="round"
            stroke-linejoin="round"
            class={merged.class}
        >
            {paths[merged.name]}
        </svg>
    );
};

export default Icon;
