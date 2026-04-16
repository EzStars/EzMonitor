from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
import re
import shutil
import xml.etree.ElementTree as ET
import zipfile
from typing import Iterable, List, Tuple

from docx import Document
from docx.document import Document as _Document
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph

BASE_DIR = Path(__file__).resolve().parents[1]
SOURCE_DIR = BASE_DIR
OUTPUT_DIR = BASE_DIR / "04-doc解析输出"

KEYWORDS = [
    "银行知识库",
    "知识库",
    "检索",
    "权限",
    "日志",
    "审计",
    "数据库",
    "系统",
    "性能",
    "安全",
    "测试",
    "需求",
    "设计",
    "实现",
    "部署",
    "风险",
    "结论",
]

MISSING_CHECKS = [
    "摘要",
    "关键词",
    "需求分析",
    "系统设计",
    "系统实现",
    "测试",
    "结论",
    "参考文献",
]

RELATIONSHIPS_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
DRAWING_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
WORD_DRAWING_NS = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
OFFICE_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


@dataclass
class ParsedDoc:
    source_doc: Path
    source_docx: Path
    output_md: Path
    heading_titles: List[str]
    paragraph_count: int
    table_count: int
    image_count: int
    character_count: int
    keyword_counts: Counter
    low_confidence_fragments: List[str]


def extract_images_from_docx(docx_path: Path, source_doc: Path) -> List[dict[str, str]]:
    image_output_dir = OUTPUT_DIR / "images" / source_doc.stem
    if image_output_dir.exists():
        shutil.rmtree(image_output_dir)
    image_output_dir.mkdir(parents=True, exist_ok=True)

    image_records: List[dict[str, str]] = []

    with zipfile.ZipFile(docx_path, "r") as archive:
        archive_files = set(archive.namelist())
        media_files = [name for name in archive.namelist() if name.startswith("word/media/") and not name.endswith("/")]

        for media_file in media_files:
            target_path = image_output_dir / Path(media_file).name
            with archive.open(media_file) as source_stream, target_path.open("wb") as target_stream:
                shutil.copyfileobj(source_stream, target_stream)

        relation_map: dict[str, str] = {}
        if "word/_rels/document.xml.rels" in archive_files:
            rel_root = ET.fromstring(archive.read("word/_rels/document.xml.rels"))
            for rel in rel_root.findall(f".//{{{RELATIONSHIPS_NS}}}Relationship"):
                rel_id = rel.get("Id")
                rel_target = rel.get("Target", "")
                if not rel_id:
                    continue

                normalized_target = rel_target.replace("\\", "/")
                if normalized_target.startswith("../"):
                    normalized_target = normalized_target[3:]
                if not normalized_target.startswith("word/"):
                    normalized_target = f"word/{normalized_target}"

                relation_map[rel_id] = normalized_target

        referenced_media: set[str] = set()
        if "word/document.xml" in archive_files:
            doc_root = ET.fromstring(archive.read("word/document.xml"))
            for drawing in doc_root.findall(f".//{{{WORD_NS}}}drawing"):
                blip = drawing.find(f".//{{{DRAWING_NS}}}blip")
                if blip is None:
                    continue

                rel_id = blip.get(f"{{{OFFICE_REL_NS}}}embed") or blip.get(f"{{{OFFICE_REL_NS}}}link")
                if not rel_id:
                    continue

                target = relation_map.get(rel_id)
                if not target:
                    continue

                media_name = Path(target).name
                media_path = image_output_dir / media_name
                if not media_path.exists():
                    continue

                doc_pr = drawing.find(f".//{{{WORD_DRAWING_NS}}}docPr")
                title = clean_text(doc_pr.get("name", "")) if doc_pr is not None else ""
                description = clean_text(doc_pr.get("descr", "")) if doc_pr is not None else ""

                image_records.append(
                    {
                        "file_name": media_name,
                        "relative_path": media_path.relative_to(OUTPUT_DIR).as_posix(),
                        "title": title,
                        "description": description,
                    }
                )
                referenced_media.add(media_name)

        for media_file in media_files:
            media_name = Path(media_file).name
            if media_name in referenced_media:
                continue

            media_path = image_output_dir / media_name
            if not media_path.exists():
                continue

            image_records.append(
                {
                    "file_name": media_name,
                    "relative_path": media_path.relative_to(OUTPUT_DIR).as_posix(),
                    "title": "",
                    "description": "",
                }
            )

    return image_records


def iter_block_items(parent: _Document) -> Iterable[Paragraph | Table]:
    body = parent.element.body
    for child in body.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, parent)
        elif isinstance(child, CT_Tbl):
            yield Table(child, parent)


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip())


def compress_merged_cells(cells: List[str]) -> List[str]:
    compressed: List[str] = []
    for cell in cells:
        if not cell and compressed and compressed[-1] == "":
            continue
        if compressed and cell == compressed[-1] and cell != "":
            continue
        compressed.append(cell)

    while compressed and compressed[-1] == "":
        compressed.pop()

    non_empty = [c for c in compressed if c]
    if len(non_empty) > 1 and len(set(non_empty)) == 1:
        return [non_empty[0]]

    return compressed


def extract_figure_captions(paragraphs: List[str]) -> List[str]:
    captions: List[str] = []
    seen: set[str] = set()

    patterns = [
        re.compile(r"^图\s*[0-9一二三四五六七八九十]+[\.．、:\s：-].*"),
        re.compile(r"^Fig\.?\s*[0-9]+[\.\-:\s].*", re.IGNORECASE),
    ]

    for paragraph in paragraphs:
        text = clean_text(paragraph)
        if len(text) > 120:
            continue
        if not any(pattern.match(text) for pattern in patterns):
            continue
        if text in seen:
            continue
        seen.add(text)
        captions.append(text)

    return captions


def detect_heading(text: str, style_name: str) -> Tuple[int, str] | None:
    stripped = text.strip()
    if not stripped:
        return None

    style = (style_name or "").strip()
    style_lower = style.lower()

    if style_lower.startswith("heading"):
        match = re.search(r"(\d+)", style_lower)
        level = int(match.group(1)) if match else 1
        return max(1, min(level, 6)), stripped

    if "标题" in style:
        match = re.search(r"(\d+)", style)
        level = int(match.group(1)) if match else 1
        return max(1, min(level, 6)), stripped

    if re.match(r"^第[一二三四五六七八九十百零]+[章节]", stripped):
        return 1, stripped

    if re.match(r"^[一二三四五六七八九十]+[、.．]", stripped):
        return 2, stripped

    if re.match(r"^（[一二三四五六七八九十]+）", stripped):
        return 3, stripped

    match = re.match(r"^(\d+(?:\.\d+){0,4})\s+", stripped)
    if match:
        dot_count = match.group(1).count(".")
        return max(2, min(dot_count + 2, 6)), stripped

    return None


def table_to_markdown(table: Table) -> List[str]:
    rows: List[List[str]] = []
    max_cols = 0

    for row in table.rows:
        cells = [clean_text(cell.text).replace("|", "\\|").replace("\n", "<br>") for cell in row.cells]
        cells = compress_merged_cells(cells)
        if not any(cells):
            continue
        rows.append(cells)
        max_cols = max(max_cols, len(cells))

    if max_cols == 0:
        return []

    normalized = [r + [""] * (max_cols - len(r)) for r in rows]
    if not normalized:
        return []

    header = normalized[0]
    if not any(header):
        header = [f"列{i + 1}" for i in range(max_cols)]

    lines = [
        "| " + " | ".join(header) + " |",
        "| " + " | ".join(["---"] * max_cols) + " |",
    ]

    for row in normalized[1:]:
        lines.append("| " + " | ".join(row) + " |")

    return lines


def parse_docx(docx_path: Path, source_doc: Path, output_md: Path) -> ParsedDoc:
    doc = Document(str(docx_path))
    parse_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    content_lines: List[str] = []
    heading_titles: List[str] = []
    plain_paragraphs: List[str] = []
    table_count = 0
    image_records = extract_images_from_docx(docx_path, source_doc)

    for block in iter_block_items(doc):
        if isinstance(block, Paragraph):
            text = clean_text(block.text)
            if not text:
                continue

            heading = detect_heading(text, block.style.name if block.style is not None else "")
            if heading:
                level, title = heading
                heading_titles.append(title)
                content_lines.append(f"{'#' * min(level + 1, 6)} {title}")
                continue

            plain_paragraphs.append(text)
            content_lines.append(text)
            continue

        table_lines = table_to_markdown(block)
        if table_lines:
            table_count += 1
            content_lines.append("")
            content_lines.append(f"### 表格 {table_count}")
            content_lines.extend(table_lines)
            content_lines.append("")

    full_text = "\n".join(plain_paragraphs + heading_titles + [line for line in content_lines if line and not line.startswith("### 表格")])
    char_count = len(re.sub(r"\s+", "", full_text))

    keyword_counts = Counter({kw: full_text.count(kw) for kw in KEYWORDS if full_text.count(kw) > 0})

    low_confidence_fragments: List[str] = []
    for paragraph in plain_paragraphs:
        if "�" in paragraph or "□" in paragraph:
            low_confidence_fragments.append(paragraph)
            continue
        if len(paragraph) <= 8 and re.search(r"[A-Za-z0-9]{4,}", paragraph):
            low_confidence_fragments.append(paragraph)

    missing_sections = [section for section in MISSING_CHECKS if section not in full_text]

    keyword_lines = [f"- {kw}: {count} 次" for kw, count in keyword_counts.most_common()]
    if not keyword_lines:
        keyword_lines = ["- 未检测到预设关键词，建议人工补充主题词。"]

    heading_lines = [f"{idx}. {title}" for idx, title in enumerate(heading_titles[:80], start=1)]
    if not heading_lines:
        heading_lines = ["1. 未识别到标准标题样式，正文可能为连续段落。"]

    confidence_lines = [f"- {item}" for item in low_confidence_fragments[:20]]
    if not confidence_lines:
        confidence_lines = ["- 未发现明显乱码或异常短段落。"]

    missing_lines = [f"- {item}" for item in missing_sections]
    if not missing_lines:
        missing_lines = ["- 预设关键章节词均已在文档中出现。"]

    caption_candidates = extract_figure_captions(plain_paragraphs)
    caption_cursor = 0

    image_lines: List[str] = []
    if image_records:
        image_lines.append(f"- 已提取图片数: {len(image_records)}")
        image_lines.append(f"- 图片目录: images/{source_doc.stem}")
        image_lines.append(f"- 自动识别图题数: {len(caption_candidates)}")
        image_lines.append("")
        for idx, image in enumerate(image_records, start=1):
            title = image["title"]
            description = image["description"]

            if not title and caption_cursor < len(caption_candidates):
                title = caption_candidates[caption_cursor]
                caption_cursor += 1

            if not title:
                title = f"图片{idx}"

            if not description:
                description = "未提供图片描述，建议补充图题与图注。"

            image_lines.extend(
                [
                    f"### 图 {idx}: {title}",
                    f"- 原始文件: {image['file_name']}",
                    f"- 描述: {description}",
                    f"![图{idx}-{title}]({image['relative_path']})",
                    "",
                ]
            )
    else:
        image_lines.append("- 文档中未检测到可提取图片。")

    md_lines = [
        f"# {source_doc.stem} 解析稿",
        "",
        "## 来源映射",
        f"- 源文件（doc）: {source_doc.name}",
        f"- 转换文件（docx）: {docx_path.name}",
        f"- 解析时间: {parse_time}",
        "- 转换方式: Word COM 批量转换（doc -> docx）",
        f"- 输出文件: {output_md.name}",
        "",
        "## 文档概览",
        f"- 正文段落数: {len(plain_paragraphs)}",
        f"- 识别标题数: {len(heading_titles)}",
        f"- 表格数: {table_count}",
        f"- 图片数: {len(image_records)}",
        f"- 估算字符数（去空白）: {char_count}",
        "",
        "## 章节结构（自动识别）",
        *heading_lines,
        "",
        "## 关键信息提炼",
        "### 主题词频",
        *keyword_lines,
        "",
        "### 缺失项提示（用于后续补写）",
        *missing_lines,
        "",
        "### 低置信度片段",
        *confidence_lines,
        "",
        "## 图片提取与解读",
        *image_lines,
        "",
        "## 详细内容（按解析顺序）",
        *content_lines,
        "",
        "## 用于 Prompt 的输入建议",
        "- 先锁定本文件中的已知事实，再生成章节正文，避免跨文档误引。",
        "- 对“缺失项提示”中的章节优先补齐证据链与边界条件。",
        "- 涉及数据、接口、参数时，仅引用文档原文中可定位的描述。",
        "- 若需要改写为学术语体，应先保留术语不变，再做句式规范化。",
    ]

    output_md.write_text("\n".join(md_lines), encoding="utf-8")

    return ParsedDoc(
        source_doc=source_doc,
        source_docx=docx_path,
        output_md=output_md,
        heading_titles=heading_titles,
        paragraph_count=len(plain_paragraphs),
        table_count=table_count,
        image_count=len(image_records),
        character_count=char_count,
        keyword_counts=keyword_counts,
        low_confidence_fragments=low_confidence_fragments,
    )


def build_index(parsed_docs: List[ParsedDoc]) -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    aggregate = Counter()
    for item in parsed_docs:
        aggregate.update(item.keyword_counts)

    stats_rows = [
        "| 文档 | 段落数 | 标题数 | 表格数 | 图片数 | 字符数 | 输出 |",
        "| --- | ---: | ---: | ---: | ---: | ---: | --- |",
    ]

    for item in parsed_docs:
        stats_rows.append(
            "| "
            + " | ".join(
                [
                    item.source_doc.name,
                    str(item.paragraph_count),
                    str(len(item.heading_titles)),
                    str(item.table_count),
                    str(item.image_count),
                    str(item.character_count),
                    item.output_md.name,
                ]
            )
            + " |"
        )

    aggregate_lines = [f"- {kw}: {count} 次" for kw, count in aggregate.most_common()[:20]]
    if not aggregate_lines:
        aggregate_lines = ["- 未统计到关键词命中。"]

    prompt_signals = [
        "- 把‘来源映射’设为强制字段：每条结论需回指到具体文档与章节。",
        "- 把‘缺失项提示’接入生成前检查：缺失事实时先输出信息需求，不允许编造。",
        "- 把‘低置信度片段’接入人工复核清单，防止乱码或错误术语进入正文。",
        "- 对四份文档建立统一术语表，避免章节写作时术语漂移。",
        "- 对实现与测试章节设置硬约束：必须包含边界条件、适用范围、局限性。",
    ]

    lines = [
        "# 毕业论文文档解析总览",
        "",
        f"- 生成时间: {timestamp}",
        f"- 文档总数: {len(parsed_docs)}",
        "- 说明: 本目录文件由 docx 解析脚本自动生成，用于后续 Prompt 迭代与章节写作输入。",
        "",
        "## 统计总览",
        *stats_rows,
        "",
        "## 跨文档主题词频（Top 20）",
        *aggregate_lines,
        "",
        "## Prompt 增强信号",
        *prompt_signals,
        "",
        "## 文件清单",
    ]

    for item in parsed_docs:
        lines.append(f"- {item.output_md.name}")

    (OUTPUT_DIR / "00-解析总览.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    doc_files = sorted(SOURCE_DIR.glob("*.doc"))
    if not doc_files:
        raise SystemExit("No .doc files found in source directory.")

    parsed_docs: List[ParsedDoc] = []

    for source_doc in doc_files:
        docx_path = source_doc.with_suffix(".docx")
        if not docx_path.exists():
            print(f"[SKIP] Missing converted file: {docx_path.name}")
            continue

        output_md = OUTPUT_DIR / f"{source_doc.stem}.md"
        parsed = parse_docx(docx_path, source_doc, output_md)
        parsed_docs.append(parsed)
        print(f"[OK] {source_doc.name} -> {output_md.name}")

    if not parsed_docs:
        raise SystemExit("No documents parsed. Check conversion results first.")

    build_index(parsed_docs)
    print(f"[OK] Summary generated: {(OUTPUT_DIR / '00-解析总览.md').name}")


if __name__ == "__main__":
    main()
