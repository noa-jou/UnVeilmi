# How to Prepare and Add a Video to README.md

## Goal

I recorded a short UnVeilmi demo video and wanted to place it directly in my GitHub README.

The original recording was:

```text
Format: WebM
Duration: about 1 minute 27 seconds
Resolution: 1916 × 1014
Size: about 21 MB
```

The overall process became:

```text
Record demo
    ↓
Compress and convert video
    ↓
Check the final file
    ↓
Upload it temporarily through a GitHub Issue
    ↓
Read the Issue content with GitHub CLI
    ↓
Extract the GitHub-hosted attachment URL
    ↓
Place the URL in README.md
```

---

## Why I Converted It to MP4

GitHub can work with WebM video, so converting to MP4 was not strictly required.

However, I chose MP4 with H.264 because it has very broad browser support and is a practical format for sharing a demo video.

The goal was:

```text
Original WebM
    ↓
Compress and resize
    ↓
H.264 MP4
    ↓
Smaller file for GitHub
```

---

## FFmpeg Command I Used

From the directory containing the original recording:

```bash
ffmpeg -i "Screen recording 2026-10-01 11.42.09.webm"   -vf "scale=1280:-2,fps=30"   -c:v libx264   -preset medium   -crf 28   -movflags +faststart   "unveilmi-demo.mp4"
```

This created:

```text
unveilmi-demo.mp4
```

---

## What the Options Mean

### `-i`

```bash
-i "Screen recording 2026-10-01 11.42.09.webm"
```

This tells FFmpeg which file to use as the input video.

### `scale=1280:-2`

```bash
-vf "scale=1280:-2,fps=30"
```

This resizes the video width to 1280 pixels.

The `-2` tells FFmpeg to calculate the height automatically while keeping the original aspect ratio and using a valid even-numbered value.

### `fps=30`

```text
fps=30
```

This limits the video to 30 frames per second.

For a normal UI demo, 30 FPS is usually enough and helps reduce file size.

### `libx264`

```bash
-c:v libx264
```

This encodes the video using H.264.

### `-preset medium`

```bash
-preset medium
```

The preset controls the balance between encoding speed and compression efficiency.

### `-crf 28`

```bash
-crf 28
```

CRF controls video quality and file size.

A higher CRF usually means a smaller file and lower quality.

A lower CRF usually means a larger file and higher quality.

### `-movflags +faststart`

```bash
-movflags +faststart
```

This rearranges MP4 metadata so the video can begin playing before the entire file has downloaded.

That is useful for web playback.

---

## How I Checked the Result

I checked the final file with:

```bash
ffprobe -v error   -show_entries format=duration,size   -of default=noprint_wrappers=1   unveilmi-demo.mp4
```

The result was:

```text
duration=86.767000
size=1975926
```

This means:

```text
Duration: about 86.8 seconds
Size: about 1.98 MB
```

So the video went from roughly 21 MB to about 1.98 MB.

I could also check the human-readable file size with:

```bash
ls -lh unveilmi-demo.mp4
```

---

## Creating a Temporary GitHub Issue for the Video

From the UnVeilmi repository, I ran:

```bash
gh issue create   --title "Temporary video upload"   --body "UnVeilmi demo"   --attach docs/images/unveilmi-demo.mp4
```

GitHub CLI returned:

```text
Creating issue in noa-jou/UnVeilmi

https://github.com/noa-jou/UnVeilmi/issues/1
```

The temporary Issue contained the uploaded video.

GitHub hosted the attachment and generated a URL in the form:

```text
https://github.com/user-attachments/assets/...
```

That hosted URL was the part I actually needed.

---

## Reading the Issue Content with GitHub CLI

Because the video was uploaded through Issue `#1`, I could inspect the Issue body directly from the terminal.

```bash
gh issue view 1 --json body --jq '.body'
```

This prints only the Issue body instead of opening the browser.

The output contains the attachment information added by GitHub.

For example, it may contain a line with a URL like:

```text
https://github.com/user-attachments/assets/...
```

If I want to inspect the complete Issue in a more human-readable form, I can also use:

```bash
gh issue view 1
```

---

## Extracting Only the Attachment URL

Instead of manually copying the URL from the full Issue body, I can extract only GitHub attachment URLs:

```bash
gh issue view 1 --json body --jq '.body'   | grep -oE 'https://github\.com/user-attachments/assets/[A-Za-z0-9-]+'
```

This should return something like:

```text
https://github.com/user-attachments/assets/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

That is the URL I need for the README.

I can also save it into a shell variable:

```bash
VIDEO_URL=$(gh issue view 1 --json body --jq '.body'   | grep -oE 'https://github\.com/user-attachments/assets/[A-Za-z0-9-]+')
```

Then I can check it with:

```bash
echo "$VIDEO_URL"
```

---

## Putting the Video URL in `README.md`

I then open `README.md` and place the attachment URL on its own line in the Demo section.

For example:

```md
## Demo

The demo below shows the UnVeilmi workflow.

https://github.com/user-attachments/assets/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Because the GitHub-hosted attachment URL is on its own line, GitHub can render it directly as a playable video in the README.

The important flow is therefore:

```text
gh issue create --attach ...
    ↓
Issue #1 contains the uploaded attachment
    ↓
gh issue view 1 --json body --jq '.body'
    ↓
extract https://github.com/user-attachments/assets/...
    ↓
paste that URL into README.md
```

---

## What I Learned

A screen recording can often be compressed heavily without becoming difficult to watch.

For a GitHub demo, I do not necessarily need the original recording resolution or a very high frame rate.

I also learned that a temporary GitHub Issue can be used as an upload step. GitHub stores the attached video and gives it a hosted attachment URL.

The useful part is not the Issue itself, but the generated:

```text
https://github.com/user-attachments/assets/...
```

URL.

Using GitHub CLI means I can inspect the Issue and retrieve that URL without needing to manually search through the GitHub website.

For this UnVeilmi demo, the complete workflow became:

```text
WebM screen recording
    ↓
FFmpeg compression
    ↓
1.98 MB MP4
    ↓
Temporary GitHub Issue
    ↓
gh issue view
    ↓
GitHub attachment URL
    ↓
README.md
    ↓
Playable demo
```
