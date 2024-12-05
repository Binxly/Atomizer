# Atomic Notes Generator for Obsidian

This plugin helps break down large notes into smaller, atomic notes using OpenAI's API.

## Network Usage Disclosure
This plugin makes network requests to:
- OpenAI API (api.openai.com) for generating atomic notes from your content
- Your notes' content is sent to OpenAI for processing. Please review OpenAI's privacy policy.

## Requirements
- An OpenAI API key is required for full functionality

## Functionality
- Set your OpenAI API key in settings.
- Press `Alt+A` to open the command palette and select "Atomize Selected Note" to process the currently selected note. Alternatively, you can use the icon in the left sidebar.
- Send selected note to OpenAI for processing, where it will be broken down into atomic notes that aim to extract key insights from the original note.
- Frontmatter will be added to each new note, including the date and any custom tags you've configured.
- Models supported: `gpt-4o-mini`, `gpt-4o`; Can be configured in settings.
