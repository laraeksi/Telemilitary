from pathlib import Path
import re
import subprocess
import sys


def extract_mermaid_blocks(markdown_text: str) -> list[str]:
    pattern = re.compile(r"```mermaid\s*(.*?)```", re.DOTALL | re.IGNORECASE)
    return [block.strip() for block in pattern.findall(markdown_text)]


def normalize_for_cli(diagram: str) -> str:
    # Mermaid CLI parser is stricter with some label punctuation.
    return diagram.replace("(JSDoc)", "JSDoc")


def run_mmdc(input_path: Path, output_path: Path, width: int = 1800, height: int = 1000) -> None:
    command = [
        "cmd",
        "/c",
        "npx",
        "-y",
        "@mermaid-js/mermaid-cli",
        "-i",
        str(input_path),
        "-o",
        str(output_path),
        "-w",
        str(width),
        "-H",
        str(height),
        "-b",
        "white",
    ]
    subprocess.run(command, check=True)


def main() -> int:
    docs_dir = Path(__file__).resolve().parent
    source_md = docs_dir / "architecture-diagram.md"
    if not source_md.exists():
        print(f"Source markdown not found: {source_md}")
        return 1

    blocks = extract_mermaid_blocks(source_md.read_text(encoding="utf-8"))
    if len(blocks) < 2:
        print("Expected at least 2 mermaid blocks (architecture and data model).")
        return 1

    arch_mmd = docs_dir / "architecture-diagram.mmd"
    data_mmd = docs_dir / "data-model-diagram.mmd"
    arch_mmd.write_text(normalize_for_cli(blocks[0]) + "\n", encoding="utf-8")
    data_mmd.write_text(normalize_for_cli(blocks[1]) + "\n", encoding="utf-8")

    arch_png = docs_dir / "architecture-diagram.png"
    data_png = docs_dir / "data-model-diagram.png"

    run_mmdc(arch_mmd, arch_png)
    run_mmdc(data_mmd, data_png)

    print(f"Updated: {arch_png}")
    print(f"Updated: {data_png}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
