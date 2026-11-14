import re

Q = chr(34)
B = "src/components/settings/tabs/"
ru_add = {}


def read(p):
    with open(p, encoding="utf8", newline="") as f:
        return f.read()


def write(p, s):
    if 'from "@utils/i18n"' not in s:
        i = s.index("import ")
        s = s[:i] + 'import { t } from "@utils/i18n";\n' + s[i:]
    with open(p, "w", encoding="utf8", newline="") as f:
        f.write(s)


def line(path, en, ru):
    """A JSX text line that holds only plain text."""
    s = read(path)
    pat = re.compile(r"^(\s*)" + re.escape(en) + r"(\s*)$", re.M)
    if not pat.search(s):
        print("MISSING", path, en[:50])
        return
    s = pat.sub(lambda m: m.group(1) + "{t(" + Q + en + Q + ")}" + m.group(2), s, count=1)
    write(path, s)
    ru_add[en] = ru


def block(path, old, new, pairs):
    s = read(path)
    if old not in s:
        print("MISSING BLOCK", path, old[:50])
        return
    write(path, s.replace(old, new, 1))
    ru_add.update(pairs)


line(B + "patchHelper/FullPatchInput.tsx", "Paste your full JSON patch here to fill out the fields", "Вставьте сюда патч целиком в формате JSON, чтобы заполнить поля")
line(B + "patchHelper/index.tsx", "Copy to Clipboard", "Скопировать")
line(B + "patchHelper/index.tsx", "Copy as Codeblock", "Скопировать как блок кода")
line(B + "plugins/index.tsx", "Restart now to apply new plugins and their settings", "Перезапустите, чтобы применить новые плагины и их настройки")
line(B + "plugins/index.tsx", "Required Plugins", "Обязательные плагины")
line(B + "plugins/UIElements.tsx", "Manage plugin UI elements", "Элементы интерфейса плагинов")
line(B + "plugins/UIElements.tsx", "Allows you to hide buttons you don't like", "Можно скрыть кнопки, которые вам не нужны")
line(B + "plugins/UIElements.tsx", "Buttons of enabled plugins will appear here.", "Здесь появятся кнопки включённых плагинов.")
line(B + "sync/BackupAndRestoreTab.tsx", "Import Settings", "Импорт настроек")
line(B + "sync/BackupAndRestoreTab.tsx", "Export Settings", "Экспорт настроек")
line(B + "sync/CloudTab.tsx", "Which backend to use when using cloud integrations.", "Какой сервер использовать для облачных функций.")
line(B + "sync/CloudTab.tsx", "Sync Rules for This Device", "Правила синхронизации для этого устройства")
line(B + "sync/CloudTab.tsx", "You can let changes flow both ways, or choose one place to be the main source of truth.", "Изменения могут идти в обе стороны, либо можно выбрать один главный источник.")
line(B + "sync/CloudTab.tsx", "Upload Settings", "Отправить настройки")
line(B + "sync/CloudTab.tsx", "Download Settings", "Скачать настройки")
line(B + "sync/CloudTab.tsx", "Delete Settings from Cloud", "Удалить настройки из облака")
line(B + "sync/CloudTab.tsx", "Delete your Cloud Account", "Удалить облачный аккаунт")
line(B + "themes/index.tsx", "Online Themes", "Темы по ссылке")
line(B + "themes/ThemeCard.tsx", "Discord Server", "Сервер Discord")
line(B + "updater/Components.tsx", "Your local copy has more recent commits. Please stash or reset them.", "В вашей копии есть более свежие коммиты. Уберите их через stash или сбросьте.")
line(B + "updater/Components.tsx", "Check for Updates", "Проверить обновления")
line(B + "vencord/NotificationSettings.tsx", "Settings for Notifications sent by Vencord.", "Настройки уведомлений, которые показывает Vencord.")
line(B + "vencord/NotificationSettings.tsx", "Notification Settings", "Настройки уведомлений")
line(B + "vencord/NotificationSettings.tsx", "View Notification Log", "Открыть журнал уведомлений")
line(B + "vencord/NotificationSettings.tsx", "Some plugins may show you notifications. These come in two styles:", "Некоторые плагины показывают уведомления. Они бывают двух видов:")
line(B + "vencord/NotificationSettings.tsx", "The amount of notifications to save in the log until old ones are removed.", "Сколько уведомлений хранить в журнале, прежде чем старые будут удаляться.")
line(B + "vencord/WindowsMaterialSettings.tsx", "Windows transparent background effects. You need a theme that supports transparency or this will do nothing. A restart is required after changing this setting.", "Эффекты прозрачного фона Windows. Нужна тема с поддержкой прозрачности, иначе ничего не изменится. После смены этой настройки нужен перезапуск.")

block(B + "sync/BackupAndRestoreTab.tsx",
      """                    You can import and export your Vencord settings as a JSON file.
                    This allows you to easily transfer your settings to another device,
                    or recover your settings after reinstalling Vencord or Discord.""",
      """                    {t("You can import and export your Vencord settings as a JSON file. This allows you to easily transfer your settings to another device, or recover your settings after reinstalling Vencord or Discord.")}""",
      {"You can import and export your Vencord settings as a JSON file. This allows you to easily transfer your settings to another device, or recover your settings after reinstalling Vencord or Discord.":
       "Настройки можно импортировать и экспортировать в виде JSON-файла. Так их легко перенести на другое устройство или вернуть после переустановки Vencord или Discord."})

block(B + "sync/CloudTab.tsx",
      """                Vencord comes with a cloud integration that adds goodies like settings sync across devices.
                It <Link href="https://vencord.dev/cloud/privacy">respects your privacy</Link>, and
                the <Link href="https://github.com/Vencord/Backend">source code</Link> is AGPL 3.0 licensed so you
                can host it yourself.""",
      """                {t("Vencord comes with a cloud integration that adds goodies like settings sync across devices.")}{" "}
                <Link href="https://vencord.dev/cloud/privacy">{t("It respects your privacy")}</Link>
                {", "}
                <Link href="https://github.com/Vencord/Backend">{t("the source code is AGPL 3.0 licensed so you can host it yourself.")}</Link>""",
      {"Vencord comes with a cloud integration that adds goodies like settings sync across devices.": "В Vencord есть облако с приятными дополнениями, например синхронизацией настроек между устройствами.",
       "It respects your privacy": "Оно уважает вашу приватность",
       "the source code is AGPL 3.0 licensed so you can host it yourself.": "исходный код открыт под лицензией AGPL 3.0, так что сервер можно поднять самому."})

block(B + "themes/index.tsx",
      """                        Themes and custom CSS have the potential to cause major lag! If you experience performance issues, try
                        disabling your themes and CSS to see if they're the cause. The most common cause of lag is the <code>:has()</code> operator.""",
      """                        {t("Themes and custom CSS can cause major lag! If you experience performance issues, try disabling your themes and CSS to see if they're the cause. The most common cause of lag is the :has() operator.")}""",
      {"Themes and custom CSS can cause major lag! If you experience performance issues, try disabling your themes and CSS to see if they're the cause. The most common cause of lag is the :has() operator.":
       "Темы и свой CSS могут сильно тормозить Discord! Если появились лаги, попробуйте отключить темы и CSS. Чаще всего тормозит оператор :has()."})

block(B + "themes/OnlineThemesTab.tsx",
      """                    This section is for advanced users. If you are having difficulties using it, use the
                    Local Themes tab instead.""",
      """                    {t("This section is for advanced users. If you are having difficulties using it, use the Local Themes tab instead.")}""",
      {"This section is for advanced users. If you are having difficulties using it, use the Local Themes tab instead.":
       "Этот раздел для опытных пользователей. Если не получается, используйте вкладку «Локальные темы»."})

block(B + "vencord/index.tsx",
      """                    Hint: You can change the position of this settings section in the{" "}
                    <a onClick={() => openPluginModal(SettingsPlugin)}>
                        settings of the Settings plugin
                    </a>!""",
      """                    {t("Hint: You can change the position of this settings section in the")}{" "}
                    <a onClick={() => openPluginModal(SettingsPlugin)}>
                        {t("settings of the Settings plugin")}
                    </a>""",
      {"Hint: You can change the position of this settings section in the": "Подсказка: положение этого раздела можно изменить в",
       "settings of the Settings plugin": "настройках плагина Settings"})

# append dictionary entries
ru = read("src/utils/i18n/ru.ts")
body = ru.rstrip()
assert body.endswith("};")
extra = "\n    // Added by i18n_manual.py\n"
for k, v in ru_add.items():
    if (Q + k.replace(Q, "\\" + Q) + Q + ":") in ru:
        continue
    extra += "    " + Q + k.replace(Q, "\\" + Q) + Q + ": " + Q + v.replace(Q, "\\" + Q) + Q + ",\n"
body = body[:-2].rstrip("\n") + "\n" + extra + "};\n"
with open("src/utils/i18n/ru.ts", "w", encoding="utf8", newline="") as f:
    f.write(body)
print("done", len(ru_add))
