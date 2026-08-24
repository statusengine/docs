# Projekt: Statusengine Dokumentations-Webseite

## Technologie-Stack & Umgebung
- **Framework:** Hugo (Static Site Generator)
- **Theme:** Hextra, bitte hier ins Repository legen damit alles bei uns liegt
- **Umgebung:** Docker-basiert für lokale Entwicklung und Builds
- **CI/CD / Deployment:** Bereitstellung des statischen `public/`-Ordners
- **Design / Farbcode:** Hauptfarbe für Logo und Akzente ist `#b03b2d`
- **Features:** Syntax Highlighting für alle Code-Blöcke (standardmäßig über Hugos integriertes 'Chroma')

## Inhalts- & Verzeichnisstruktur
- **Landing Page:** Hauptseite unter `content/_index.md` (Fokus auf Skalierung von Nagios/Naemon mit C++ Broker und Go Worker).
- **Broker Dokumentation:** Abgelegt in `content/docs/broker.md`. Thematisiert das C++ Event Broker Modul, Gearman, RabbitMQ und JSON-Codierung.
- **Worker Dokumentation:** Abgelegt in `content/docs/worker.md`. Thematisiert den Go-Worker, Datenbank-Backend MySQL und Performance-Daten mit Graphite
- **Tutorials:** Abgelegt im Verzeichnis `content/tutorials/`.

## Code- & Style-Richtlinien
- **Syntax Highlighting:** Jedes Code-Beispiel MUSS mit dem korrekten Sprach-Tag versehen werden (z. B. ```cpp für den Broker, ``` go für den Worker, ```toml für Konfigurationen).
- **Farbkonsistenz:** Nutze in CSS/SCSS-Variablen oder Tailwind-Konfigurationen für die primären UI-Elemente (Aktionen, Links, Logo-Umfeld) exakt den Hex-Code `#b03b2d`.
- **Sprache:** Die Dokumentation wird standardmäßig nur auf Englisch verfasst.
- **Moderner Look:** Bitte nutzte ein modernes Design mit Verläufen und Hell/Dark

## Workflow-Regeln für Claude Code
1. **Keine ungetesteten Builds:** Generiere nach dem Hinzufügen von Inhalt oder Layout-Änderungen die Seite lokal über den Docker-Build-Befehl, um Syntaxfehler in den Hugo-Shortcodes oder im Front-Matter zu vermeiden.
2. **Front-Matter Validierung:** Jede neue Markdown-Datei benötigt ein sauberes YAML- oder TOML-Front-Matter mit `title`, `date` und `weight` für die korrekte Sortierung im Menü.
3. **Kontext bewahren:** Beziehe dich bei inhaltlichen Fragen zum Broker auf die Architektur des C++ Moduls und beim Worker auf das Go-Backend. Erfinde keine Konfigurationsparameter.

## Datenschutz
1. **Keine CDNs:** Ich lebe in Deutschland wo Datenschutz sehr wichtig ist, benutzte keine CDNs, alles muss vom eigenen Server geladen werden.

## Referenzen
1. **Aktuelle Dokumentation:** https://statusengine.org/
2. **Broder Code:** /home/nook24/git/broker/
3. **Worker Code:** /home/nook24/git/statusengine-worker