# Chorus — NEAR submission film

120 seconds · 1920 × 1080 · 24 fps · H.264 / AAC

The final deliverable is `output/chorus-near-submission.mp4`.
`output/chorus-captions.srt` provides timed captions, which are also burned into the video.
`output/storyboard.png` provides the ten-scene contact sheet.

## Creative direction

An intimate, conversational product film with a dry opening joke, generous typography,
coral and amber accents, restrained camera drift, responsive pointer motion and visible
interface state changes. One community art campaign carries the story from objective
through members, tasks, contribution reports, policy and the activity ledger.

Narration uses the authenticated ElevenLabs CLI and the Chris voice
(`iP95p4xoKVk53GoZ742B`) with `eleven_multilingual_v2`. The quiet musical bed is
procedurally composed for this film. No external music or stock footage is used.

## Presentation scope

The product views are vector motion-design reconstructions of implemented Chorus
features, using illustrative workspace data. This is an animated feature walkthrough,
not a recording of a browser session. Browser automation was unavailable during
production. The film labels the sample workspace and does not stage a wallet
signature, transfer, funded approval, AI generation, or independent settlement check.
The NEAR chapter describes the integration and displays its current limits.

## Rebuild

Requires Node, the repo's `sharp` package, FFmpeg with libx264, and an authenticated
ElevenLabs CLI. Set `FFMPEG_PATH` to the absolute FFmpeg executable path if needed.

```bash
node video/film.mjs speech
node video/film.mjs previews
node video/film.mjs render
node video/film.mjs finish
```

Audio and scene renders are cached. Move the matching generated output aside before
rebuilding a changed scene. Provider responses include base64 audio and timestamps;
The final MP4, captions, and storyboard are tracked in Git. Intermediate files in
`output/` are ignored and contain no credentials.

Before submitting, review the complete film with sound, confirm it matches the
hackathon's current rules, and upload the MP4 to the required submission destination.
