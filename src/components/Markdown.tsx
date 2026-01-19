import { Component, createMemo } from "solid-js";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface MarkdownProps {
    children: string;
}

// Configure marked options
marked.use({
    breaks: true,
    gfm: true,
});

const Markdown: Component<MarkdownProps> = (props) => {
    const html = createMemo(() => {
        const rawHtml = marked.parse(props.children || "") as string;
        return DOMPurify.sanitize(rawHtml);
    });

    return <div innerHTML={html()} />;
};

export default Markdown;
