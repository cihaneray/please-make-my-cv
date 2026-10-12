"""Editable Word rendering of the semantic HTML used by the live preview."""

import base64
import re
from io import BytesIO
from urllib.parse import urlsplit

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Mm, Pt, RGBColor
from lxml import html

from app.exporters.html_pdf_exporter import HtmlPdfExporter
from app.schemas.resume import ResumeDocument


def _text(value: str) -> str:
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\ud800-\udfff\ufffe\uffff]", "", value)


def _border(p, color, width, space=3):
    borders = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    for key, value in {
        "val": "single",
        "sz": str(width),
        "color": color,
        "space": str(space),
    }.items():
        bottom.set(qn("w:" + key), value)
    borders.append(bottom)
    p._p.get_or_add_pPr().append(borders)


def _link(p, label, target, size, color):
    try:
        parsed = urlsplit(target)
        safe = parsed.scheme.lower() in {"http", "https", "mailto", "tel"}
        if parsed.scheme.lower() in {"http", "https"}:
            safe = (
                safe
                and bool(parsed.netloc)
                and not re.search(r"(?:javascript|data|vbscript):", target, re.I)
            )
    except ValueError:
        safe = False
    if not safe:
        p.add_run(label)
        return
    relation = p.part.relate_to(
        target,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
        is_external=True,
    )
    link = OxmlElement("w:hyperlink")
    link.set(qn("r:id"), relation)
    run = OxmlElement("w:r")
    properties = OxmlElement("w:rPr")
    for name, value in (("sz", str(round(size * 2))), ("color", color)):
        element = OxmlElement("w:" + name)
        element.set(qn("w:val"), value)
        properties.append(element)
    run.append(properties)
    text = OxmlElement("w:t")
    text.set(qn("xml:space"), "preserve")
    text.text = label
    run.append(text)
    link.append(run)
    p._p.append(link)


def render_docx(resume: ResumeDocument) -> bytes:
    word = Document()
    for border in word.styles.element.xpath(".//w:pBdr"):
        border.getparent().remove(border)
    template = (resume.design.template or resume.metadata.templateId or "minimal").lower().strip()
    if template not in {"technical", "professional", "minimal", "classic"}:
        template = "minimal"
    color = resume.design.accentColor.lstrip("#")
    if not re.fullmatch(r"[a-fA-F0-9]{6}", color):
        color = "0F172A"
    size = resume.design.fontSize
    font_size = float(size[:-2]) if re.fullmatch(r"(?:[8-9]|1[0-4])(?:\.5)?pt", size) else 10
    scale = font_size / 10
    family = {
        "Inter": "Arial",
        "Arial": "Arial",
        "Helvetica Neue": "Arial",
        "Georgia": "Georgia",
        "Menlo": "Courier New",
    }.get(resume.design.fontFamily, "Arial")
    section = word.sections[0]
    section.page_width, section.page_height = Mm(210), Mm(297)
    vertical, horizontal = {"compact": (10, 10), "normal": (15, 18), "spacious": (20, 20)}.get(
        resume.design.margins, (15, 18)
    )
    section.top_margin = section.bottom_margin = Mm(vertical)
    section.left_margin = section.right_margin = Mm(horizontal)
    content_width = section.page_width - section.left_margin - section.right_margin
    for name in ("Normal", "Title", "Heading 1", "List Bullet"):
        style = word.styles[name]
        style.font.name = family
        style.font.size = Pt(font_size)
        style.font.color.rgb = RGBColor.from_string("18181B")
        style.paragraph_format.space_before = style.paragraph_format.space_after = Pt(0)
        style.paragraph_format.line_spacing = 1.45
        style.paragraph_format.widow_control = True
    for name, size in (("Title", 20), ("Heading 1", 8.5)):
        word.styles[name].font.size = Pt(size * scale)
        word.styles[name].font.color.rgb = RGBColor.from_string(color)
        word.styles[name].font.bold = True
    bullet = word.styles["List Bullet"].paragraph_format
    bullet.left_indent, bullet.first_line_indent = Pt(10.5), Pt(-7.5)
    bullet.line_spacing, bullet.space_after = 1.4, Pt(1.5)
    word.core_properties.title = _text(resume.metadata.title)
    word.core_properties.author = _text(
        resume.profile.firstName + " " + resume.profile.lastName
    ).strip()
    word.core_properties.subject = _text(resume.metadata.targetRole)
    page = html.fromstring(_text(HtmlPdfExporter.render_html(resume))).xpath(
        '//div[@class="cv-page"]'
    )[0]
    section_gap = {"compact": 7.5, "normal": 10.5, "relaxed": 13.5}.get(resume.design.spacing, 10.5)

    def inline(p, node, size=font_size, shade="18181B", bold=None, italic=None, uppercase=False):
        if node.tag == "a":
            _link(p, "".join(node.itertext()).strip(), node.get("href", ""), size, shade)
            return
        if node.tag == "strong":
            bold = True

        def add(value):
            if not value:
                return
            value = re.sub(r"[\t\r\n ]+", " ", value)
            run = p.add_run(value.upper() if uppercase else value)
            run.font.size, run.font.color.rgb = Pt(size), RGBColor.from_string(shade)
            run.bold, run.italic = bold, italic

        add(node.text)
        for child in node:
            if child.tag == "a":
                project_link = "entry-url" in child.get("class", "").split()
                _link(
                    p,
                    "".join(child.itertext()).strip(),
                    child.get("href", ""),
                    8 * scale if project_link else size,
                    "6B7280" if project_link else shade,
                )
            else:
                inline(
                    p,
                    child,
                    size,
                    shade,
                    True
                    if child.tag == "strong" or child.get("class") == "skill-category"
                    else bold,
                    True if child.tag == "em" else italic,
                    uppercase,
                )
            add(child.tail)

    def paragraph(node, style=None, size=font_size, shade="18181B"):
        p = word.add_paragraph(style=style)
        inline(p, node, size, shade)
        return p

    def entry_header(node):
        children = [child for child in node if "".join(child.itertext()).strip()]
        if not children:
            return
        table = word.add_table(rows=1, cols=len(children))
        table.autofit = False
        widths = {1: [1], 2: [0.68, 0.32], 3: [0.51, 0.25, 0.24], 4: [0.47, 0.20, 0.13, 0.20]}[
            len(children)
        ]
        if len(children) == 2 and children[-1].get("class") == "entry-dates":
            date_width = len("".join(children[-1].itertext())) * 8 * scale * 0.48 + 12
            fraction = min(0.36, max(0.18, date_width / (content_width / Pt(1))))
            if any(value in "".join(children[-1].itertext()) for value in ("Devam", "Present")):
                fraction = max(0.30, fraction)
            widths = [1 - fraction, fraction]
        if "cert-row" in node.get("class", "") and len(children) == 4:
            widths = [0.54, 0.13, 0.12, 0.21]
        margins = OxmlElement("w:tblCellMar")
        for edge in ("top", "left", "bottom", "right"):
            element = OxmlElement("w:" + edge)
            element.set(qn("w:w"), "60" if edge in {"left", "right"} else "0")
            element.set(qn("w:type"), "dxa")
            margins.append(element)
        table._tbl.tblPr.append(margins)
        for column, cell, child, fraction in zip(
            table.columns, table.rows[0].cells, children, widths, strict=True
        ):
            column.width = cell.width = round(content_width * fraction)
            p = cell.paragraphs[0]
            p.paragraph_format.keep_with_next = p.paragraph_format.keep_together = True
            cls = child.get("class", "")
            if cls == "entry-dates":
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                inline(p, child, 8 * scale, "6B7280")
            elif "entry-title" in cls.split():
                inline(p, child, font_size, "111827", bold=True)
            elif "cert-row" in node.get("class", ""):
                inline(p, child, 8.5 * scale, "18181B")
            else:
                inline(p, child, 8 * scale, "6B7280")
        table.rows[0]._tr.get_or_add_trPr().append(OxmlElement("w:cantSplit"))

    sizes = {
        "summary-text": (9, "374151"),
        "entry-desc": (8.5, "4B5563"),
        "entry-subtitle": (8.5, "4B5563"),
        "entry-subtitle italic": (8.5, "4B5563"),
        "technologies": (8, "4B5563"),
        "skill-row": (8.5, "18181B"),
        "languages-row": (8.5, "374151"),
    }

    def render(node):
        if not "".join(node.itertext()).strip():
            return
        cls = node.get("class", "")
        if cls.startswith("entry-header"):
            entry_header(node)
        elif node.tag == "ul":
            for child in node:
                if "".join(child.itertext()).strip():
                    paragraph(child, style="List Bullet", size=8.8 * scale, shade="27272A")
        elif cls in {"entry", "skills-container"}:
            start = len(word.paragraphs)
            for child in node:
                render(child)
            paragraphs = word.paragraphs[start:]
            for p in paragraphs[:-1]:
                p.paragraph_format.keep_with_next = cls == "entry"
            if paragraphs:
                paragraphs[-1].paragraph_format.keep_with_next = False
                paragraphs[-1].paragraph_format.space_after = Pt(6.75 if cls == "entry" else 0)
        elif cls in sizes:
            size, shade = sizes[cls]
            p = paragraph(node, size=size * scale, shade=shade)
            p.paragraph_format.line_spacing = 1.5 if cls == "summary-text" else 1.45
            p.paragraph_format.space_after = Pt(2.25 if cls in {"entry-desc", "skill-row"} else 0)
            if cls.endswith("italic"):
                for run in p.runs:
                    run.italic = True
        elif node.tag == "h2":
            p = word.add_paragraph(style="Heading 1")
            inline(p, node, 8.5 * scale, color, bold=True, uppercase=True)
            p.paragraph_format.keep_with_next = True
            p.paragraph_format.space_before, p.paragraph_format.space_after = Pt(section_gap), Pt(6)
            _border(
                p,
                color
                if template == "professional"
                else "CBD5E1"
                if template == "technical"
                else "F3F4F6",
                9 if template != "minimal" else 6,
            )
        else:
            paragraph(node)

    header_container = word
    if resume.profile.photo and resume.visibility.showPhoto:
        table = word.add_table(rows=1, cols=2)
        table.autofit = False
        table.columns[0].width = table.cell(0, 0).width = content_width - Mm(29)
        table.columns[1].width = table.cell(0, 1).width = Mm(29)
        table.rows[0]._tr.get_or_add_trPr().append(OxmlElement("w:cantSplit"))
        header_container = table.cell(0, 0)
        empty = header_container.paragraphs[0]._p
        empty.getparent().remove(empty)
        image_paragraph = table.cell(0, 1).paragraphs[0]
        image_paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        image_paragraph.add_run().add_picture(
            BytesIO(base64.b64decode(resume.profile.photo.split(",", 1)[1])),
            width=Mm(18 if template == "classic" else 24),
            height=None if template == "classic" else Mm(24),
        )

    def header_paragraph(node, size, shade):
        p = header_container.add_paragraph()
        inline(p, node, size, shade)
        return p

    for node in page.find("header"):
        if node.tag == "img":
            continue
        if node.tag == "h1":
            p = header_container.add_paragraph(style="Title")
            inline(p, node, 20 * scale, color, bold=True, uppercase=template != "minimal")
            p.paragraph_format.line_spacing, p.paragraph_format.space_after = 1.2, Pt(2.25)
        elif node.get("class") == "headline":
            p = header_paragraph(node, 10.5 * scale, "4B5563")
            p.paragraph_format.space_after = Pt(4.5)
        else:
            p = header_paragraph(node, 8.5 * scale, "6B7280")
            p.paragraph_format.space_after = Pt(10.5)
            _border(
                p,
                color if template != "minimal" else "E5E7EB",
                12 if template != "minimal" else 6,
                7,
            )
        p.paragraph_format.keep_with_next = True
        if template == "professional":
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for section_node in page.findall("section"):
        for node in section_node:
            render(node)
    buffer = BytesIO()
    word.save(buffer)
    return buffer.getvalue()
