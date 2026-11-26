"""Package a prebuilt Next.js standalone server for direct Azure deployment."""
from pathlib import Path
import json
import tarfile
import zipfile
import subprocess
import os

root = Path(__file__).resolve().parent.parent
output = root.parent / "work" / "vela-azure-current.zip"
standalone = root / ".next" / "standalone"
output.parent.mkdir(parents=True, exist_ok=True)
if not (standalone / "server.js").is_file():
    raise RuntimeError("Build the standalone app first")

entries = {}


def add_tree(base, prefix=""):
    for directory, folders, files in os.walk(base):
        folders[:] = [name for name in folders if name not in {"deploy-stage", ".git", ".vs", "cache", "standalone"} and "win32" not in name]
        for filename in files:
            if filename == ".env" or filename.startswith(".env.") or "win32" in filename:
                continue
            path = Path(directory) / filename
            relative = path.relative_to(base)
            entries[(Path(prefix) / relative).as_posix()] = path



add_tree(standalone)
add_tree(root / ".next" / "static", ".next/static")
add_tree(root / "public", "public")
add_tree(root / "generated", "generated")
add_tree(root / ".vela" / "specs", ".vela/specs")
if "server.js" not in entries:
    raise RuntimeError("Missing standalone server")

with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for name, source in entries.items():
        archive.write(source, name)
    for package, version in [
        ("sharp-linux-x64", "0.35.5"),
        ("sharp-libvips-linux-x64", "1.3.4"),
    ]:
        tar_path = root.parent / "work" / f"img-{package}-{version}.tgz"
        if not tar_path.is_file():
            subprocess.run(
                ["npm.cmd" if os.name == "nt" else "npm", "pack",
                 f"@img/{package}@{version}", "--pack-destination", str(output.parent)],
                cwd=root, check=True,
            )
        with tarfile.open(tar_path, "r:gz") as tar:
            for member in tar.getmembers():
                parts = Path(member.name).parts
                if not member.isfile() or parts[0] != "package" or ".." in parts:
                    continue
                data = tar.extractfile(member).read()
                name = "node_modules/@img/" + package + "/" + "/".join(parts[1:])
                archive.writestr(name, data)
    archive.writestr(
        "public/deployment-version.json",
        json.dumps({"build": (root / ".next" / "BUILD_ID").read_text().strip()}),
    )

with zipfile.ZipFile(output) as archive:
    names = set(archive.namelist())
    for required in [
        "server.js", "public/vela-tab-v2.svg", "public/vela-logo-v2.png",
        ".next/BUILD_ID", "generated/app-client/index.js",
    ]:
        if required not in names:
            raise RuntimeError("Missing package asset: " + required)
    if any(Path(name).name.startswith(".env") for name in names):
        raise RuntimeError("Environment file found in deployment")
print(f"Packaged {len(names)} files, {output.stat().st_size} bytes, no environment files")
print(output)
