import { Component, For, Show, createSignal, onMount, onCleanup } from "solid-js";
import Icon from "./Icon";
import "./CustomSelect.css";

export interface SelectOption {
    value: string;
    label: string;
    description?: string; // For models
}

export interface SelectGroup {
    label: string;
    options: SelectOption[];
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: (SelectOption | SelectGroup)[];
    placeholder?: string;
    disabled?: boolean;
}

const CustomSelect: Component<CustomSelectProps> = (props) => {
    const [isOpen, setIsOpen] = createSignal(false);
    let containerRef: HTMLDivElement | undefined;

    // Flatten options for finding selected label
    const getSelectedLabel = () => {
        if (!props.value) return props.placeholder || "Select...";

        for (const item of props.options) {
            if ('options' in item) { // It's a group
                const found = item.options.find(o => o.value === props.value);
                if (found) return found.label;
            } else { // It's an option
                if (item.value === props.value) return item.label;
            }
        }
        return props.value;
    };

    const handleClickOutside = (e: MouseEvent) => {
        if (containerRef && !containerRef.contains(e.target as Node)) {
            setIsOpen(false);
        }
    };

    onMount(() => {
        document.addEventListener("click", handleClickOutside);
        onCleanup(() => document.removeEventListener("click", handleClickOutside));
    });

    const handleSelect = (value: string) => {
        props.onChange(value);
        setIsOpen(false);
    };

    return (
        <div class={`custom-select ${isOpen() ? "open" : ""} ${props.disabled ? "disabled" : ""}`} ref={containerRef}>
            <div
                class="select-trigger"
                onClick={() => !props.disabled && setIsOpen(!isOpen())}
            >
                <span class="selected-value">
                    {getSelectedLabel()}
                </span>
                <Icon name="chevron-down" size={16} class="select-arrow" />
            </div>

            <Show when={isOpen()}>
                <div class="select-dropdown">
                    <For each={props.options}>
                        {(item) => (
                            <Show
                                when={'options' in item}
                                fallback={
                                    // Single Option
                                    <div
                                        class={`select-option ${(item as SelectOption).value === props.value ? "selected" : ""}`}
                                        onClick={() => handleSelect((item as SelectOption).value)}
                                    >
                                        <span>{(item as SelectOption).label}</span>
                                        <Show when={(item as SelectOption).description}>
                                            <span class="option-desc">{(item as SelectOption).description}</span>
                                        </Show>
                                    </div>
                                }
                            >
                                {/* Option Group */}
                                <div class="select-group">
                                    <div class="group-label">{(item as SelectGroup).label}</div>
                                    <For each={(item as SelectGroup).options}>
                                        {(option) => (
                                            <div
                                                class={`select-option ${option.value === props.value ? "selected" : ""}`}
                                                onClick={() => handleSelect(option.value)}
                                            >
                                                <span class="option-label">{option.label}</span>
                                                <Show when={option.description}>
                                                    <span class="option-desc">{option.description}</span>
                                                </Show>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </Show>
                        )}
                    </For>
                </div>
            </Show>
        </div>
    );
};

export default CustomSelect;
