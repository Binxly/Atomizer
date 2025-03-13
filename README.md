# Atomizer: Turn notes into ideas

**NOTE: THIS PLUGIN IS CURRENTLY IN ITS EARLY STAGES OF DEVELOPMENT. UPDATES WILL BE SPARSE UNTIL I HAVE MORE TIME TO DEDICATE TO ADDING FEATURES! THANK YOU FOR THE FEEDBACK SO FAR! :)**

This plugin helps break down large notes into smaller, "atomic" style notes and ideas, using the OpenAI API.

## Requirements

- An OpenAI API key is required for full functionality

## Usage

- Set your OpenAI API key in settings.
- Open the command palette and select "Atomize Selected Note" to process the currently selected note; Alternatively, you can use the icon in the left sidebar.
- Sends selected note to OpenAI for processing, where it will be broken down into "atomic notes" that aim to extract key insights from the original note.
- Frontmatter will be added to each new note, including the date and any custom tags you've configured from the settings menu.

### Models supported

- `gpt-4o-mini`
- `gpt-4o`

## Network Usage Disclosure

This plugin makes network requests to:

- OpenAI API (api.openai.com) for generating atomic notes from your content
- Your notes' content is sent to OpenAI for processing. Please review OpenAI's privacy policy.
