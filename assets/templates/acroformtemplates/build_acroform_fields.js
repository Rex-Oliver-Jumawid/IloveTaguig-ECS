const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');

// Page height in PDF points (from the structure extraction: 936 x 612)
const PAGE_H = 612;

// Each field: x0/x1 = horizontal bounds, top/bottom = vertical bounds
// measured from the TOP of the page (matches the structure-extraction convention).
const fields = [
  { name: 'owner_full_name',  x0: 36,  x1: 770, top: 224, bottom: 239 }, // blank line under "...is granted to"
  { name: 'business_name',    x0: 104, x1: 770, top: 244, bottom: 259 }, // after "and owner of"
  { name: 'business_address', x0: 87,  x1: 536, top: 265, bottom: 279 }, // after "located at"
  { name: 'reference_no',     x0: 133, x1: 420, top: 471, bottom: 486 }, // after "REFERENCE NO:"
  { name: 'ownership_type',   x0: 148, x1: 420, top: 494, bottom: 509 }, // after "OWNERSHIP/TYPE:"
  { name: 'status',           x0: 90,  x1: 420, top: 517, bottom: 532 }, // after "STATUS:"
  { name: 'clerk_initial',    x0: 130, x1: 420, top: 540, bottom: 555 }, // after "CLERK INITIAL:"
  { name: 'issued_day',       x0: 90,  x1: 156, top: 400, bottom: 415 }, // the "___________" after "Issued this"
  { name: 'issued_month',     x0: 190, x1: 313, top: 400, bottom: 415 }, // the blank inside "of_____________________,"
];

async function main() {
  const bytes = fs.readFileSync('/mnt/user-data/uploads/BARANGAY_BUSINESS_CLEARANCE.pdf');
  const pdfDoc = await PDFDocument.load(bytes);
  const form = pdfDoc.getForm();
  const page = pdfDoc.getPage(0);

  for (const f of fields) {
    const textField = form.createTextField(f.name);
    textField.setText('');
    textField.addToPage(page, {
      x: f.x0,
      y: PAGE_H - f.bottom,
      width: f.x1 - f.x0,
      height: f.bottom - f.top,
      borderWidth: 0,
      borderColor: undefined,
      backgroundColor: undefined,
    });
    textField.setFontSize(10);
  }

  const outBytes = await pdfDoc.save();
  fs.writeFileSync('/home/claude/acroform/clearance_fillable.pdf', outBytes);
  console.log('Created clearance_fillable.pdf with', fields.length, 'fields:', fields.map(f => f.name).join(', '));
}

main().catch(e => { console.error(e); process.exit(1); });
