from pathlib import Path

path = Path("frontend/src/pages/QuotationDetail.jsx")
text = path.read_text(encoding="utf-8")

old = """        <div className="flex items-center gap-3">
          <Button onClick={handlePrint} disabled={!quotation}>
            <Printer className="w-4 h-4 ml-2" />
            ᠟� �� ��� PDF
          </Button>
        </div>"""

new = """        <div className="flex items-center gap-3">
          <Button onClick={handlePrint} disabled={!quotation}>
            <Printer className="w-4 h-4 ml-2" />
            طباعة
          </Button>
          <Button
            onClick={handleDownloadPdf}
            disabled={!quotation or exporting}
            variant="outline"
            className="flex items-center gap-2"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            حفظ PDF
          </Button>
        </div>"""

if old not in text:
    raise SystemExit("pattern not found for print block replacement")

text = text.replace(old, new)
path.write_text(text, encoding="utf-8")
