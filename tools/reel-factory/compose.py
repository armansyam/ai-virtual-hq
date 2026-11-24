"""Menyusun video Reels 1080x1920 dari rekaman record.js: foto latar tema (blur) + judul + laptop + ponsel + musik.

Pemakaian: python3 compose.py <recordDir> <outMp4> --title "Kalandra" --subtitle "..." [--music file.mp3]
Hasil: <outMp4> (H.264 60 fps, maks ±10 MB untuk unggah Instagram) dan <outMp4 tanpa .mp4>-cover.jpg.
"""
import argparse
import json
import os
import random
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1080, 1920
GOLD = (201, 162, 39)
FONT_CANDIDATES = {
    "serif": ["/System/Library/Fonts/Supplemental/Georgia Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"],
    "sans": ["/System/Library/Fonts/Supplemental/Arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"],
    "sans_bold": ["/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"],
}
# Letak layar perangkat di kanvas 1080x1920.
LAPTOP = {"x": 90, "y": 820, "w": 800, "h": 500}
PHONE = {"x": 690, "y": 1000, "w": 300, "h": 650}


def font(kind, size):
    for p in FONT_CANDIDATES[kind]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default(size=size)


def ffmpeg_bin():
    out = subprocess.run(["node", "-e", "process.stdout.write(require('ffmpeg-static'))"], cwd=HERE, capture_output=True, text=True, check=True)
    return out.stdout.strip()


def wrap(draw, text, fnt, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if draw.textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def build_base(record_dir, title, subtitle, out_path):
    """Latar: frame sampul desktop tema (foto asli tema) diblur & digelapkan, judul, bingkai laptop."""
    laptop_frames = sorted(os.listdir(os.path.join(record_dir, "laptop")))
    # Frame setelah sampul dibuka (±35% durasi) memuat foto tema; frame awal masih layar pembuka gelap.
    src = Image.open(os.path.join(record_dir, "laptop", laptop_frames[int(len(laptop_frames) * 0.35)])).convert("RGB")
    scale = max(W / src.width, H / src.height)
    bg = src.resize((int(src.width * scale), int(src.height * scale)))
    bg = bg.crop(((bg.width - W) // 2, (bg.height - H) // 2, (bg.width - W) // 2 + W, (bg.height - H) // 2 + H))
    bg = bg.filter(ImageFilter.GaussianBlur(26))
    base = Image.alpha_composite(bg.convert("RGBA"), Image.new("RGBA", (W, H), (12, 10, 9, 118)))
    d = ImageDraw.Draw(base)

    d.text((W // 2, 170), "TEMA UNDANGAN DIGITAL  ·  LUXVITE", fill=GOLD, font=font("sans_bold", 26), anchor="ma")
    title_font = font("serif", 104)
    y = 240
    for line in wrap(d, title, title_font, W - 160)[:2]:
        d.text((W // 2, y), line, fill=(250, 246, 240), font=title_font, anchor="ma")
        y += 122
    sub_font = font("sans", 36)
    for line in wrap(d, subtitle, sub_font, W - 200)[:3]:
        d.text((W // 2, y + 20), line, fill=(222, 214, 202), font=sub_font, anchor="ma")
        y += 50
    d.line([(W // 2 - 60, y + 70), (W // 2 + 60, y + 70)], fill=GOLD, width=4)

    # Bingkai laptop: tutup + bezel di sekeliling layar, alas di bawahnya.
    lx, ly, lw, lh = LAPTOP["x"], LAPTOP["y"], LAPTOP["w"], LAPTOP["h"]
    d.rounded_rectangle((lx - 22, ly - 22, lx + lw + 22, ly + lh + 30), radius=26, fill=(24, 22, 21, 255), outline=(70, 66, 62, 255), width=2)
    d.polygon([(lx - 70, ly + lh + 30), (lx + lw + 70, ly + lh + 30), (lx + lw + 110, ly + lh + 62), (lx - 110, ly + lh + 62)], fill=(58, 55, 52, 255))
    d.rounded_rectangle((lx + lw // 2 - 70, ly + lh + 30, lx + lw // 2 + 70, ly + lh + 40), radius=5, fill=(40, 38, 36, 255))

    d.text((W // 2, H - 150), "Coba demonya di luxvite.id/demo", fill=(250, 246, 240), font=font("sans_bold", 38), anchor="ma")
    base.convert("RGB").save(out_path)


def build_phone_overlay(out_path):
    """Lapisan atas: badan ponsel dengan lubang layar transparan (sudut layar membulat)."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    px, py, pw, ph = PHONE["x"], PHONE["y"], PHONE["w"], PHONE["h"]
    d.rounded_rectangle((px - 16, py - 16, px + pw + 16, py + ph + 16), radius=58, fill=(18, 17, 16, 255), outline=(201, 162, 39, 160), width=3)
    hole = Image.new("L", (W, H), 0)
    ImageDraw.Draw(hole).rounded_rectangle((px, py, px + pw, py + ph), radius=42, fill=255)
    alpha = layer.split()[3]
    alpha.paste(0, mask=hole)
    layer.putalpha(alpha)
    ImageDraw.Draw(layer).rounded_rectangle((px + pw // 2 - 48, py + 12, px + pw // 2 + 48, py + 34), radius=11, fill=(8, 8, 8, 255))
    layer.save(out_path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("record_dir")
    ap.add_argument("out_mp4")
    ap.add_argument("--title", required=True)
    ap.add_argument("--subtitle", default="")
    ap.add_argument("--music", default="")
    a = ap.parse_args()

    meta = json.load(open(os.path.join(a.record_dir, "record.json")))
    seconds = float(meta["seconds"])
    music = a.music or random.choice([os.path.join(HERE, "music", f) for f in sorted(os.listdir(os.path.join(HERE, "music"))) if f.endswith(".mp3")])
    base_png = os.path.join(a.record_dir, "base.png")
    phone_png = os.path.join(a.record_dir, "phone_frame.png")
    build_base(a.record_dir, a.title, a.subtitle, base_png)
    build_phone_overlay(phone_png)

    ff = ffmpeg_bin()
    filt = (
        f"[1:v]fps=60,scale={LAPTOP['w']}:{LAPTOP['h']}:flags=lanczos[lap];"
        f"[2:v]scale={PHONE['w']}:{PHONE['h']}:flags=lanczos[ph];"
        f"[0:v][lap]overlay={LAPTOP['x']}:{LAPTOP['y']}[a];"
        f"[a][ph]overlay={PHONE['x']}:{PHONE['y']}[b];"
        f"[b][3:v]overlay=0:0,fade=t=in:st=0:d=0.4,fade=t=out:st={seconds - 0.6:.2f}:d=0.6,format=yuv420p[v];"
        f"[4:a]atrim=0:{seconds:.2f},afade=t=in:st=0:d=0.8,afade=t=out:st={seconds - 1.6:.2f}:d=1.6[au]"
    )

    def encode(crf):
        cmd = [ff, "-y", "-hide_banner", "-loglevel", "error",
               "-loop", "1", "-framerate", "60", "-t", f"{seconds:.2f}", "-i", base_png,
               "-framerate", "30", "-i", os.path.join(a.record_dir, "laptop", "%05d.jpg"),
               "-framerate", "60", "-i", os.path.join(a.record_dir, "phone", "%05d.jpg"),
               "-loop", "1", "-framerate", "60", "-t", f"{seconds:.2f}", "-i", phone_png,
               "-i", music,
               "-filter_complex", filt, "-map", "[v]", "-map", "[au]",
               "-c:v", "libx264", "-preset", "medium", "-crf", str(crf), "-r", "60",
               "-c:a", "aac", "-b:a", "160k", "-t", f"{seconds:.2f}", "-movflags", "+faststart", a.out_mp4]
        subprocess.run(cmd, check=True)

    encode(21)
    if os.path.getsize(a.out_mp4) > 10 * 1024 * 1024:
        encode(25)
    cover = os.path.splitext(a.out_mp4)[0] + "-cover.jpg"
    subprocess.run([ff, "-y", "-hide_banner", "-loglevel", "error", "-ss", "2.0", "-i", a.out_mp4, "-frames:v", "1", "-q:v", "3", cover], check=True)
    print(json.dumps({"ok": True, "video": a.out_mp4, "cover": cover, "bytes": os.path.getsize(a.out_mp4), "music": os.path.basename(music)}))


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as err:
        print(json.dumps({"ok": False, "error": f"ffmpeg gagal (exit {err.returncode})"}))
        sys.exit(1)
