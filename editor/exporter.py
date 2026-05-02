from __future__ import annotations

import base64
import json
import shutil
import subprocess
import uuid
from pathlib import Path
from typing import Any


class ExportError(RuntimeError):
    pass


class FrameExportSession:
    def __init__(self, root: Path, options: dict[str, Any]):
        self.id = uuid.uuid4().hex
        self.root = root / self.id
        self.frames = self.root / "frames"
        self.options = options
        self.root.mkdir(parents=True, exist_ok=True)
        self.frames.mkdir(parents=True, exist_ok=True)

    def save_frame(self, index: int, data_url: str) -> Path:
        if "," not in data_url:
            raise ExportError("Frame invalido: data URL ausente.")
        _, payload = data_url.split(",", 1)
        raw = base64.b64decode(payload)
        path = self.frames / f"frame_{index:06d}.png"
        path.write_bytes(raw)
        return path


class FFmpegExporter:
    def __init__(self, temp_root: Path, exports_root: Path):
        self.temp_root = temp_root
        self.exports_root = exports_root
        self.sessions: dict[str, FrameExportSession] = {}

    @property
    def available(self) -> bool:
        return self.ffmpeg_path() is not None

    def ffmpeg_path(self) -> str | None:
        system = shutil.which("ffmpeg")
        if system:
            return system
        root = self.temp_root.parent
        candidates = [
            root / "tools" / "ffmpeg" / "bin" / "ffmpeg.exe",
            root / "tools" / "ffmpeg" / "ffmpeg.exe",
            root / "ffmpeg.exe",
        ]
        for candidate in candidates:
            if candidate.exists():
                return str(candidate)
        try:
            import imageio_ffmpeg  # type: ignore

            return imageio_ffmpeg.get_ffmpeg_exe()
        except Exception:
            return None

    def begin(self, options: dict[str, Any]) -> FrameExportSession:
        session = FrameExportSession(self.temp_root / "frame_exports", options)
        self.sessions[session.id] = session
        return session

    def save_frame(self, session_id: str, index: int, data_url: str) -> Path:
        session = self._session(session_id)
        return session.save_frame(index, data_url)

    def finish(self, session_id: str, project: dict[str, Any], options: dict[str, Any]) -> Path:
        if not self.available:
            raise ExportError("FFmpeg nao encontrado no PATH.")
        ffmpeg = self.ffmpeg_path()

        session = self._session(session_id)
        settings = project.get("settings") or {}
        fps = int(options.get("fps") or settings.get("fps") or 30)
        width = int(options.get("width") or settings.get("width") or 1920)
        height = int(options.get("height") or settings.get("height") or 1080)
        bitrate = str(options.get("bitrate") or "12M")
        output = Path(options.get("outputPath") or self.exports_root / f"{project.get('name', 'export')}.mp4")
        output.parent.mkdir(parents=True, exist_ok=True)
        fmt = str(options.get("format") or output.suffix.lstrip(".") or "mp4").lower()

        first_frame = session.frames / "frame_000000.png"
        if not first_frame.exists():
            raise ExportError("Nenhum frame foi gerado para exportacao.")

        if fmt == "gif" or output.suffix.lower() == ".gif":
            command = [
                ffmpeg,
                "-y",
                "-framerate",
                str(fps),
                "-i",
                str(session.frames / "frame_%06d.png"),
                "-vf",
                f"scale={width}:{height}:flags=lanczos,fps={fps}",
                "-loop",
                "0",
                str(output),
            ]
            result = subprocess.run(command, capture_output=True, text=True)
            if result.returncode != 0:
                raise ExportError(result.stderr[-4000:] or "FFmpeg falhou ao exportar GIF.")
            return output

        command = [
            ffmpeg,
            "-y",
            "-framerate",
            str(fps),
            "-i",
            str(session.frames / "frame_%06d.png"),
            "-vf",
            f"scale={width}:{height}:flags=lanczos,format=yuv420p",
            "-c:v",
            "libx264",
            "-preset",
            str(options.get("preset") or "medium"),
            "-b:v",
            bitrate,
        ]

        audio_inputs, filter_parts = self._audio_mix(project)
        for audio in audio_inputs:
            command.extend(["-i", audio["path"]])
        if audio_inputs:
            command.extend(["-filter_complex", ";".join(filter_parts), "-map", "0:v", "-map", "[amixout]", "-shortest"])

        command.append(str(output))
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode != 0:
            raise ExportError(result.stderr[-4000:] or "FFmpeg falhou ao exportar.")
        return output

    def extract_audio(self, source: Path, output_root: Path) -> Path:
        if not self.available:
            raise ExportError("FFmpeg nao encontrado no PATH.")
        ffmpeg = self.ffmpeg_path()
        output = output_root / f"{source.stem}_audio.wav"
        command = [ffmpeg, "-y", "-i", str(source), "-vn", "-acodec", "pcm_s16le", "-ar", "48000", str(output)]
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode != 0:
            raise ExportError(result.stderr[-4000:] or "Nao foi possivel separar o audio.")
        return output

    def extract_preview_audio(self, source: Path, output_root: Path) -> Path:
        if not self.available:
            raise ExportError("FFmpeg nao encontrado no PATH.")
        ffmpeg = self.ffmpeg_path()
        output_root.mkdir(parents=True, exist_ok=True)
        output = output_root / f"{source.stem}_preview.m4a"
        if output.exists() and output.stat().st_size > 0:
            return output
        command = [ffmpeg, "-y", "-i", str(source), "-vn", "-c:a", "aac", "-b:a", "160k", str(output)]
        result = subprocess.run(command, capture_output=True, text=True, timeout=120)
        if result.returncode != 0 or not output.exists():
            raise ExportError(result.stderr[-4000:] or "Nao foi possivel gerar audio de preview.")
        return output

    def extract_video_frame(self, source: Path, time_seconds: float, output_root: Path) -> Path:
        if not self.available:
            raise ExportError("FFmpeg nao encontrado no PATH.")
        ffmpeg = self.ffmpeg_path()
        output_root.mkdir(parents=True, exist_ok=True)
        safe_time = max(0.0, float(time_seconds or 0.0))
        stamp = int(round(safe_time * 10))
        output = output_root / f"{source.stem}_{stamp:08d}.png"
        if output.exists() and output.stat().st_size > 0:
            return output
        command = [
            ffmpeg,
            "-y",
            "-ss",
            f"{safe_time:.3f}",
            "-i",
            str(source),
            "-frames:v",
            "1",
            "-an",
            "-vf",
            "scale='min(1920,iw)':-2",
            str(output),
        ]
        result = subprocess.run(command, capture_output=True, text=True, timeout=20)
        if result.returncode != 0 or not output.exists():
            raise ExportError(result.stderr[-4000:] or "Nao foi possivel gerar o frame do video.")
        return output

    def quick_proxy_export(self, project: dict[str, Any], options: dict[str, Any]) -> Path:
        if not self.available:
            raise ExportError("FFmpeg nao encontrado no PATH.")
        ffmpeg = self.ffmpeg_path()
        media = project.get("media") or []
        first_video = next((m for m in media if m.get("type") == "video" and m.get("path")), None)
        if not first_video:
            raise ExportError("Nao ha video importado para exportacao rapida.")
        output = Path(options.get("outputPath") or self.exports_root / f"{project.get('name', 'export')}_proxy.mp4")
        bitrate = str(options.get("bitrate") or "12M")
        command = [ffmpeg, "-y", "-i", first_video["path"], "-c:v", "libx264", "-b:v", bitrate, "-c:a", "aac", str(output)]
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode != 0:
            raise ExportError(result.stderr[-4000:] or "FFmpeg falhou ao exportar proxy.")
        return output

    def _session(self, session_id: str) -> FrameExportSession:
        session = self.sessions.get(session_id)
        if not session:
            raise ExportError("Sessao de exportacao expirada.")
        return session

    def _audio_mix(self, project: dict[str, Any]) -> tuple[list[dict[str, str]], list[str]]:
        layers = project.get("layers") or []
        media = {item.get("id"): item for item in project.get("media") or []}
        audio_layers = [
            layer
            for layer in layers
            if layer.get("type") == "audio" and not layer.get("hidden") and (layer.get("mediaId") in media)
        ]
        inputs: list[dict[str, str]] = []
        filters: list[str] = []
        labels: list[str] = []
        for idx, layer in enumerate(audio_layers):
            item = media[layer.get("mediaId")]
            input_index = idx + 1
            start_ms = max(0, int(float(layer.get("start", 0)) * 1000))
            audio = layer.get("audio") or {}
            volume = float(audio.get("volume", 1))
            fade_in = float(audio.get("fadeIn", 0))
            fade_out = float(audio.get("fadeOut", 0))
            speed = max(0.5, min(2.0, float(audio.get("speed", 1) or 1)))
            pitch = max(-12.0, min(12.0, float(audio.get("pitch", 0) or 0)))
            pan = max(-1.0, min(1.0, float(audio.get("pan", 0) or 0)))
            low = float(audio.get("low", 0) or 0)
            mid = float(audio.get("mid", 0) or 0)
            high = float(audio.get("high", 0) or 0)
            reverb = max(0.0, min(1.0, float(audio.get("reverb", 0) or 0)))
            duration = float(layer.get("duration") or item.get("duration") or 0)
            label = f"a{idx}"
            chain = f"[{input_index}:a]adelay={start_ms}:all=1,volume={volume}"
            if abs(pitch) > 0.001:
                factor = round(2 ** (pitch / 12), 5)
                tempo_fix = round(1 / factor, 5)
                chain += f",asetrate=48000*{factor},aresample=48000,atempo={tempo_fix}"
            if abs(speed - 1) > 0.001:
                chain += f",atempo={speed}"
            if abs(pan) > 0.001:
                left = round(1 - max(0, pan), 3)
                right = round(1 + min(0, pan), 3)
                chain += f",pan=stereo|c0={left}*c0|c1={right}*c1"
            if abs(low) > 0.001:
                chain += f",bass=g={low}"
            if abs(mid) > 0.001:
                chain += f",equalizer=f=1000:t=q:w=1:g={mid}"
            if abs(high) > 0.001:
                chain += f",treble=g={high}"
            if reverb > 0:
                chain += f",aecho=0.8:0.88:{int(60 + reverb * 220)}:{round(0.12 + reverb * 0.35, 2)}"
            if audio.get("compressor") or audio.get("enhance"):
                chain += ",acompressor=threshold=-18dB:ratio=3:attack=12:release=120"
            if audio.get("limiter") or audio.get("normalize"):
                chain += ",alimiter=limit=0.95"
            if fade_in > 0:
                chain += f",afade=t=in:st=0:d={fade_in}"
            if fade_out > 0 and duration > fade_out:
                chain += f",afade=t=out:st={duration - fade_out}:d={fade_out}"
            chain += f"[{label}]"
            filters.append(chain)
            labels.append(f"[{label}]")
            inputs.append({"path": item["path"]})
        if labels:
            filters.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0[amixout]")
        return inputs, filters


def json_ok(**payload: Any) -> str:
    return json.dumps({"ok": True, **payload}, ensure_ascii=False)


def json_error(message: str) -> str:
    return json.dumps({"ok": False, "error": message}, ensure_ascii=False)
