import { Component, For, Show, createSignal, onMount } from "solid-js";
import { getSkillsList, SkillMetadata } from "../lib/tauri-api";
import { useI18n } from "../stores/i18n";
import Icon from "./Icon";
import "./SkillsList.css";

interface SkillsListProps {
  onClose: () => void;
}

const SkillsList: Component<SkillsListProps> = (props) => {
  const { t } = useI18n();
  const [skills, setSkills] = createSignal<SkillMetadata[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [selectedSkill, setSelectedSkill] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      const skillsList = await getSkillsList();
      setSkills(skillsList);
    } catch (error) {
      console.error("Failed to load skills:", error);
    } finally {
      setLoading(false);
    }
  });

  return (
    <div class="skills-list">
      <div class="skills-header">
        <div class="header-content">
          <h2>{t("skills.title")}</h2>
          <p>{t("skills.desc")}</p>
        </div>
        <button class="header-close-btn" onClick={props.onClose}>
          <Icon name="close" size={24} />
        </button>
      </div>

      <Show
        when={!loading()}
        fallback={
          <div class="skills-loading">
            <p>{t("skills.loading")}</p>
          </div>
        }
      >
        <Show
          when={skills().length > 0}
          fallback={
            <div class="skills-empty">
              <h3>{t("skills.empty.title")}</h3>
              <p>{t("skills.empty.desc")}</p>
              <div class="skills-help">
                <h4>{t("skills.help.title")}</h4>
                <ol>
                  <li>{t("skills.help.step1")}</li>
                  <li>{t("skills.help.step2")}</li>
                  <li>{t("skills.help.step3")}</li>
                  <li>{t("skills.help.step4")}</li>
                  <li>{t("skills.help.step5")}</li>
                </ol>
              </div>
            </div>
          }
        >
          <div class="skills-grid">
            <For each={skills()}>
              {(skill) => (
                <div class="skill-card">
                  <div class="skill-header">
                    <h3 class="skill-name">{skill.name}</h3>
                    <div class="skill-badge">{t("skills.active")}</div>
                  </div>
                  <p class="skill-description">{skill.description}</p>
                  <div class="skill-actions">
                    <button
                      class="skill-button"
                      onClick={() => setSelectedSkill(skill.name)}
                    >
                      {t("skills.viewDetails")}
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>

      <Show when={selectedSkill()}>
        <div class="skill-modal-overlay" onClick={() => setSelectedSkill(null)}>
          <div class="skill-modal" onClick={(e) => e.stopPropagation()}>
            <div class="skill-modal-header">
              <h3>Skill: {selectedSkill()}</h3>
              <button
                class="skill-modal-close"
                onClick={() => setSelectedSkill(null)}
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div class="skill-modal-content">
              <p><strong>{t("skills.modal.location")}</strong> App data directory/skills/{selectedSkill()}/</p>
              <p><strong>{t("skills.modal.files")}</strong></p>
              <ul>
                <li>SKILL.md - Main skill documentation</li>
                <li>scripts/ - Executable Python scripts</li>
                <li>*.md - Additional reference documentation</li>
              </ul>
              <p><strong>{t("skills.modal.usage")}</strong> {t("skills.modal.usageDesc")}</p>
              <p><strong>{t("skills.modal.platformPaths")}</strong></p>
              <ul>
                <li>macOS: ~/Library/Application Support/kuse-cowork/skills/</li>
                <li>Windows: %APPDATA%\kuse-cowork\skills\</li>
                <li>Linux: ~/.local/share/kuse-cowork/skills/</li>
              </ul>
            </div>
          </div>
        </div>
      </Show>
    </div >
  );
};

export default SkillsList;